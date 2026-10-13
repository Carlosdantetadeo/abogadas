import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

let writeQueue = Promise.resolve();
const feedback = (req, res, status, message, ok = false) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (req.headers.accept?.includes('application/json')) {
    res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ ok, message }));
  } else {
    const title = ok ? 'Correo registrado' : 'No se pudo registrar el correo';
    res.writeHead(status, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Sociedad de Abogadas del Perú</title><link rel="stylesheet" href="/styles.css"></head><body><main class="section container"><p class="eyebrow">Sociedad de Abogadas del Perú</p><h1>${title}</h1><p class="lead">${message}</p><a class="button primary" href="/comunidad.html">Volver a la comunidad</a></main></body></html>`);
  }
};
export async function handleSubscription(req, res, { file, port }) {
  if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return; }
  const origin = req.headers.origin;
  const allowedOrigins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  for (const origin of [process.env.SAPP_SITE_ORIGIN, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]) {
    if (origin) allowedOrigins.push(new URL(origin).origin);
  }
  if (origin && !allowedOrigins.includes(origin)) { feedback(req, res, 403, 'La solicitud debe enviarse desde la web de la Sociedad.'); return; }
  const contentType = req.headers['content-type']?.split(';')[0];
  if (!['application/json', 'application/x-www-form-urlencoded'].includes(contentType)) { feedback(req, res, 415, 'El formato de la solicitud no es válido.'); return; }
  let body = '';
  try {
    for await (const chunk of req) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > 2048) { feedback(req, res, 413, 'La solicitud es demasiado extensa.'); return; }
    }
    const data = contentType === 'application/json' ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
    if (!data || typeof data !== 'object' || Array.isArray(data)) { feedback(req, res, 400, 'La solicitud no es válida.'); return; }
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { feedback(req, res, 400, 'Ingresa un correo electrónico válido.'); return; }
    if (![true, 'on', 'true'].includes(data.consent)) { feedback(req, res, 400, 'Necesitamos tu autorización para registrar el correo.'); return; }
    const operation = writeQueue.then(async () => {
      await mkdir(dirname(file), { recursive: true });
      let subscriptions;
      try { subscriptions = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; subscriptions = []; }
      if (!Array.isArray(subscriptions)) throw new Error('Invalid subscription storage');
      if (subscriptions.some(entry => entry.email === email)) return;
      subscriptions.push({ email, createdAt: new Date().toISOString(), consentVersion: 'newsletter-v1' });
      await writeFile(file + '.tmp', JSON.stringify(subscriptions, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
      await rename(file + '.tmp', file);
    });
    writeQueue = operation.catch(() => {});
    await operation;
    feedback(req, res, 200, 'Tu correo quedó registrado en la lista de novedades.', true);
  } catch (error) {
    feedback(req, res, error instanceof SyntaxError ? 400 : 503, error instanceof SyntaxError ? 'La solicitud no es válida.' : 'No pudimos registrar tu correo. Inténtalo más tarde.');
  }
}
