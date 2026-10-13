import { spawn } from 'node:child_process';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const folder = await mkdtemp(resolve(tmpdir(), 'abogadas-newsletter-'));
const file = resolve(folder, 'subscriptions.json');
const server = spawn(process.execPath, ['serve.mjs'], { env: { ...process.env, SAPP_PREVIEW_PORT: '4180', SAPP_SUBSCRIPTIONS_FILE: file }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
server.stdout.on('data', chunk => { logs += chunk.toString(); });
server.stderr.on('data', () => {});
const endpoint = 'http://127.0.0.1:4180/api/subscriptions';
const post = (data, origin = 'http://127.0.0.1:4180') => fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(data) });
try {
  for (let i = 0; i < 50 && !logs.includes('Local:'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(logs.includes('Local:'), 'Test server starts');
  assert.equal((await post(null)).status, 400);
  assert.equal((await post({ email: 'incorrect', consent: true })).status, 400);
  assert.equal((await post({ email: 'qa@example.test', consent: false })).status, 400);
  assert.equal((await post({ email: 'qa@example.test', consent: true }, 'https://example.test')).status, 403);
  const accepted = await post({ email: 'QA@example.test', consent: true });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).ok, true);
  const simultaneous = await Promise.all([post({ email: 'qa@example.test', consent: true }), post({ email: 'second@example.test', consent: true })]);
  assert.ok(simultaneous.every(response => response.status === 200));
  const records = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(records.length, 2, 'Duplicate emails are not stored twice');
  assert.equal(records[0].consentVersion, 'newsletter-v1');
  assert.ok(records.every(record => record.createdAt));
  assert.equal((await fetch(endpoint)).status, 405, 'Subscriber storage is not exposed');
  const noScript = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=noscript%40example.test&consent=on' });
  assert.equal(noScript.status, 200);
  assert.match(noScript.headers.get('content-type'), /text\/html/);
  console.log('Subscription API: validation, consent, origin, persistence, duplicate/concurrent signup and no-JS feedback OK.');
} finally {
  server.kill();
  await unlink(file).catch(() => {});
  await unlink(file + '.tmp').catch(() => {});
  await rmdir(folder).catch(() => {});
}
