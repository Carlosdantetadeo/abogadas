import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const profile = mkdtempSync(resolve(tmpdir(), 'abogadas-browser-'));
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-background-networking', '--mute-audio',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-pipe',
  `--user-data-dir=${profile}`,
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true });
let nextId = 0;
let buffered = '';
const pending = new Map();
const errors = [];
browser.stdio[4].on('data', (chunk) => {
  buffered += chunk.toString();
  let end;
  while ((end = buffered.indexOf('\0')) >= 0) {
    const line = buffered.slice(0, end); buffered = buffered.slice(end + 1);
    if (!line) continue;
    const message = JSON.parse(line);
    const waiter = pending.get(message.id);
    if (waiter) {
      clearTimeout(waiter.timer); pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  }
});
browser.stderr.on('data', () => {});
browser.on('error', (error) => {
  for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
});
function send(method, params = {}, sessionId) {
  return new Promise((resolvePromise, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve: resolvePromise, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  // Fonts use local fallbacks during offline QA; no external requests are made.
  await cdp('Network.enable');
  await cdp('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] });
  mkdirSync('qa', { recursive: true });
  const members = JSON.parse(readFileSync('members.json', 'utf8'));
  const pages = ['index.html', 'sociedad.html', 'programas.html', 'impacto.html', 'unete.html', 'videos.html', 'contacto.html', 'yo-gerencio.html', 'comunidad-experta.html', 'tribuna-femenina.html', 'actualidad.html', 'ecosistema-profesional.html', 'membresia-de-lanzamiento.html', 'derecho-con-proposito.html', 'directorio.html', 'comunidad.html', ...members.map(member => `perfil-${member.id}.html`)];
  for (const page of pages) {
    await cdp('Page.navigate', { url: pathToFileURL(resolve('dist', page)).href });
    await pause(500);
    for (const width of [1440, 1024, 768, 375, 320]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 700 });
      await pause(120);
      const state = await evaluate(`({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        headingCount: document.querySelectorAll('h1').length,
        brokenImages: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
        overflow: [...document.querySelectorAll('main *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2) && getComputedStyle(e).position !== 'absolute'; }).slice(0, 6).map(e => e.className || e.tagName)
      })`);
      assert(state.headingCount === 1, `${page}: expected one H1`);
      assert(state.scrollWidth <= state.width + 1, `${page} at ${width}px: horizontal overflow ${JSON.stringify(state)}`);
      assert(!state.brokenImages.length, `${page}: broken images`);
      console.log(`${page}: ${width}px OK`);
      if (page === 'index.html' && [1440, 375].includes(width)) {
        const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        writeFileSync(`qa/inicio-${width}.png`, Buffer.from(data, 'base64'));
      }
      if (page === 'sociedad.html') {
        assert(await evaluate(`document.querySelectorAll('.full-team .team-photo img').length === 8`), 'Eight member photographs');
        if (width === 1440) {
          await evaluate(`document.querySelector('#equipo').scrollIntoView({ behavior: 'instant' })`);
          await pause(150);
          const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
          writeFileSync('qa/equipo-1440.png', Buffer.from(data, 'base64'));
          await evaluate("scrollTo({ top: 0, behavior: 'instant' })");
        }
      }
      if (page === 'videos.html' && [1440, 375].includes(width)) {
        assert(await evaluate(`document.querySelectorAll('[data-video]').length === 7 && !document.querySelector('#video-player').getAttribute('src')`), 'Seven videos without initial download');
        const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
        writeFileSync(`qa/videos-${width}.png`, Buffer.from(data, 'base64'));
      }
      if (page === 'directorio.html' && [1440, 375].includes(width)) {
        const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
        writeFileSync(`qa/directorio-${width}.png`, Buffer.from(data, 'base64'));
      }
    }
  }
  await cdp('Page.navigate', { url: pathToFileURL(resolve('dist/index.html')).href });
  await pause(350);
  assert(await evaluate(`document.querySelector('#main-nav').getBoundingClientRect().height === 0`), 'Mobile nav should start closed');
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  assert(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'true' && document.querySelector('#main-nav').getBoundingClientRect().height > 0`), 'Menu opens');
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  assert(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false' && document.activeElement === document.querySelector('.menu-toggle')`), 'Escape closes menu and restores focus');
  await cdp('Page.navigate', {url: pathToFileURL(resolve('dist/unete.html')).href});
  await pause(300);
  await evaluate(`document.querySelector('.faq-list summary').click()`);
  assert(await evaluate(`document.querySelector('.faq-list details').open`), 'FAQ opens');
  await cdp('Page.navigate', { url: pathToFileURL(resolve('dist/programas.html')).href });
  await pause(350);
  await evaluate(`document.querySelector('[data-goal="comunidad-experta"]').click()`);
  assert(await evaluate(`location.hash === '#comunidad-experta' && document.querySelector('#path-hint').textContent.startsWith('Comunidad Experta:')`), 'Program guidance updates and navigates');
  await cdp('Page.navigate', { url: pathToFileURL(resolve('dist/directorio.html')).href + '?area=familia' });
  await pause(350);
  assert(await evaluate(`document.querySelectorAll('[data-member]:not([hidden])').length === 1 && document.querySelector('[data-member]:not([hidden])').dataset.name.includes('Alexandra')`), 'Directory category deep link');
  await evaluate(`document.querySelector('#directory-search').reset()`);
  await pause(100);
  assert(await evaluate(`document.querySelectorAll('[data-member]:not([hidden])').length === ${members.length}`), 'Directory reset');
  await evaluate(`document.querySelector('#member-query').value = 'gomez'; document.querySelector('#member-query').dispatchEvent(new Event('input', { bubbles: true }))`);
  assert(await evaluate(`document.querySelectorAll('[data-member]:not([hidden])').length === 1`), 'Directory accented name search');
  await evaluate(`document.querySelector('#directory-search').reset()`);
  await pause(100);
  await evaluate(`document.querySelector('[data-area="tributario"]').click()`);
  assert(await evaluate(`!document.querySelector('#directory-empty').hidden && document.querySelectorAll('[data-member]:not([hidden])').length === 0`), 'Directory genuine empty category');
  await evaluate(`document.querySelector('#directory-clear').click()`);
  await pause(100);
  await evaluate(`document.querySelector('#verified-filter').checked = true; document.querySelector('#verified-filter').dispatchEvent(new Event('change'))`);
  assert(await evaluate(`document.querySelectorAll('[data-member]:not([hidden])').length === 0`), 'Unreviewed profiles do not claim verification');
  console.log('Directory filters, deep link, accented search, reset and verification state: OK');
  await cdp('Page.navigate', { url: pathToFileURL(resolve('dist/videos.html')).href });
  await pause(350);
  const carouselBefore = await evaluate(`document.querySelector('.carousel-track').scrollLeft`);
  await evaluate(`document.querySelector('[data-carousel-next]').click()`);
  await pause(650);
  assert(await evaluate(`document.querySelector('.carousel-track').scrollLeft > ${carouselBefore} && [...document.querySelectorAll('.carousel-track .video-card')].every(card => Math.abs(card.getBoundingClientRect().top - document.querySelector('.carousel-track .video-card').getBoundingClientRect().top) < 2)`), 'Videos scroll in a single horizontal row');
  console.log('Video carousel advances horizontally and stays in one row: OK');
  const media = JSON.parse(readFileSync('media.json', 'utf8'));
  for (const item of media) {
    const point = await evaluate(`(() => {
      const link = document.querySelector('[data-video="${item.src}"]');
      link.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = link.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 150) };
    })()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    const state = await evaluate(`(async () => {
      const v = document.querySelector('#video-player');
      for (let i = 0; i < 100 && (v.readyState < 2 || v.paused); i++) await new Promise(r => setTimeout(r, 100));
      return { open: document.querySelector('#video-dialog').open, ready: v.readyState, paused: v.paused, duration: v.duration, error: v.error?.code };
    })()`);
    assert(state.open && state.ready >= 2 && !state.paused && !state.error, `${item.id}: playback failed ${JSON.stringify(state)}`);
    assert(Math.abs(state.duration - item.duration) < .2, `${item.id}: wrong video`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await pause(150);
    const closed = await evaluate(`({ open: document.querySelector('#video-dialog').open, paused: document.querySelector('#video-player').paused, src: document.querySelector('#video-player').getAttribute('src'), focus: document.activeElement.dataset.video })`);
    assert(!closed.open && closed.paused && !closed.src && closed.focus === item.src, `${item.id}: close/pause/focus ${JSON.stringify(closed)}`);
    console.log(`${item.id}: playback, Escape, pause, unloaded source and focus OK`);
  }
  await cdp('Emulation.setScriptExecutionDisabled', { value: true });
  await cdp('Page.navigate', { url: pathToFileURL(resolve('dist/index.html')).href });
  await pause(350);
  assert(await evaluate(`document.querySelector('#main-nav').getBoundingClientRect().height > 0`), 'Navigation remains available without JS');
  assert(!errors.length, `Browser exceptions: ${errors.join(', ')}`);
  console.log('Mobile menu, Escape/focus, FAQ, program guidance and no-JS navigation: OK');
  console.log('Screenshots: qa/inicio-*.png, qa/equipo-1440.png and qa/videos-*.png');
} finally {
  browser.kill();
}
