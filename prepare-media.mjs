import { spawn } from 'node:child_process';
import { readdirSync, mkdirSync, copyFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const originals = readdirSync('..').filter(name => name.toLowerCase().endsWith('.mp4')).sort();
mkdirSync('dist/assets/videos', { recursive: true });
mkdirSync('qa/videos', { recursive: true });
const profile = mkdtempSync(resolve(tmpdir(), 'abogadas-media-'));
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
  '--disable-background-networking', '--no-first-run', '--remote-debugging-pipe',
  `--user-data-dir=${profile}`,
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true });
let buffer = '', id = 0;
const pending = new Map();
browser.stdio[4].on('data', chunk => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf('\0')) >= 0) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    if (!line) continue;
    const message = JSON.parse(line), waiter = pending.get(message.id);
    if (!waiter) continue;
    clearTimeout(waiter.timer); pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  }
});
browser.stderr.on('data', () => {});
function send(method, params = {}, sessionId) {
  return new Promise((resolvePromise, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(requestId, { resolve: resolvePromise, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => send(method, params, sessionId);
  await cdp('Page.enable');
  await cdp('Network.enable');
  await cdp('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] });
  await cdp('Page.navigate', { url: pathToFileURL(resolve('dist/index.html')).href });
  await new Promise(r => setTimeout(r, 300));
  const evaluate = async expression => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };
  const items = [];
  for (const [i, name] of originals.entries()) {
    const slug = `video-${String(i + 1).padStart(2, '0')}`;
    copyFileSync(resolve('..', name), `dist/assets/videos/${slug}.mp4`);
    const source = pathToFileURL(resolve('dist/assets/videos', `${slug}.mp4`)).href;
    const info = await evaluate(`(async () => {
      const old = document.querySelector('#review-video'); if (old) old.remove();
      const v = document.createElement('video'); v.id = 'review-video';
      v.muted = true; v.preload = 'auto'; v.playsInline = true;
      document.body.append(v);
      await new Promise((ok, fail) => {
        const timeout = setTimeout(() => fail(new Error('Metadata timeout')), 10000);
        v.onloadeddata = () => { clearTimeout(timeout); ok(); };
        v.onerror = () => { clearTimeout(timeout); fail(new Error('Video error ' + v.error?.code)); };
        v.src = ${JSON.stringify(source)};
      });
      return { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
    })()`);
    for (const [sample, time] of [['inicio', Math.min(1, info.duration / 5)], ['medio', info.duration / 2], ['final', Math.max(0, info.duration - 2)]]) {
      const data = await evaluate(`(async () => {
        const v = document.querySelector('#review-video');
        await new Promise((ok, fail) => {
          const timeout = setTimeout(() => fail(new Error('Seek timeout')), 8000);
          v.onseeked = () => { clearTimeout(timeout); ok(); };
          v.currentTime = ${time};
        });
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth; canvas.height = v.videoHeight;
        canvas.getContext('2d').drawImage(v, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      })()`);
      writeFileSync(`qa/videos/${slug}-${sample}.jpg`, Buffer.from(data, 'base64'));
      if (sample === 'medio') writeFileSync(`dist/assets/videos/${slug}-poster.jpg`, Buffer.from(data, 'base64'));
    }
    items.push({ id: slug, original: name, src: `assets/videos/${slug}.mp4`, poster: `assets/videos/${slug}-poster.jpg`, ...info });
    console.log(`${slug}: ${info.width} x ${info.height}, ${info.duration.toFixed(1)}s`);
  }
  writeFileSync('media.json', JSON.stringify(items, null, 2) + '\n');
  console.log(`Prepared ${items.length} original videos and their extracted posters.`);
} finally { browser.kill(); }
