import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { practiceGroups } from './features.mjs';

let queue = Promise.resolve();
const areas = new Set(practiceGroups.flatMap(([, options]) => options.map(([id]) => id)));
export const admissionForm = () => `<dialog class="admission-dialog" id="solicitud" aria-labelledby="admission-title"><div class="admission-modal-header"><button type="button" class="admission-close" data-close-admission aria-label="Cerrar formulario">×</button><div class="admission-intro"><p class="eyebrow">Solicitud de incorporación</p><h2 id="admission-title" tabindex="-1">Solicita tu incorporación.</h2><p>Contacto y perfil profesional. Los campos con * son obligatorios.</p><p class="admission-progress" data-admission-progress hidden aria-live="polite"></p></div></div><form class="admission-form" action="/api/applications" method="post" data-admission><fieldset data-admission-step="1"><legend><span>01</span> Datos de contacto</legend><div class="admission-grid"><label>Nombre completo *<input name="name" autocomplete="name" maxlength="120" minlength="3" required></label><label>Correo electrónico *<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Teléfono de contacto *<input name="phone" type="tel" autocomplete="tel" placeholder="+51 999 999 999" maxlength="25" pattern="[+0-9() .-]{7,25}" required></label><label>Ciudad o región *<input name="location" autocomplete="address-level2" maxlength="100" required></label></div></fieldset><fieldset data-admission-step="2"><legend><span>02</span> Perfil profesional</legend><div class="admission-grid"><label>Colegio de Abogados *<input name="college" placeholder="Nombre de tu colegio profesional" maxlength="120" required></label><label>Número de colegiatura *<input name="collegeNumber" maxlength="30" required></label><label class="admission-wide">Especialidad principal *<select name="area" required><option value="">Selecciona tu especialidad</option>${practiceGroups.map(([group, options]) => `<optgroup label="${group}">${options.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</optgroup>`).join('')}</select></label><details class="admission-wide admission-optional"><summary>Añadir intereses o experiencia (opcional)</summary><label>Cuéntanos sobre ti<textarea name="motivation" rows="4" maxlength="1200" placeholder="Cuéntanos brevemente sobre tu experiencia e intereses (opcional)."></textarea></label></details></div></fieldset><div class="admission-step-actions" data-admission-actions hidden><button type="button" class="button outline" data-admission-back>Volver</button><button type="button" class="button primary" data-admission-next>Continuar →</button></div><div data-admission-final><label class="admission-consent"><input type="checkbox" name="consent" required><span>Autorizo a la Sociedad de Abogadas del Perú a registrar estos datos y contactarme para gestionar mi solicitud de incorporación. *</span></label><button class="button primary" type="submit">Enviar mi solicitud <span aria-hidden="true">↗</span></button><p class="admission-status" role="status" aria-live="polite" tabindex="-1"></p><p class="fineprint">La solicitud queda pendiente de revisión; no genera un pago ni la admisión automática.</p></div></form><div class="admission-success" data-admission-success hidden tabindex="-1" role="status"><p class="eyebrow">Solicitud registrada</p><h3>Gracias por dar el primer paso.</h3><p>Tu información quedó guardada para revisión. El siguiente paso es validar tus datos profesionales y las condiciones de incorporación.</p><p class="fineprint">Si necesitas consultar el estado, utiliza el canal oficial de la Sociedad e indica el correo de tu solicitud.</p><a class="button outline" href="contacto.html">Canales de contacto</a><button type="button" class="text-link" data-admission-done>Cerrar</button></div></dialog>`;

function feedback(req, res, status, message, ok = false) {
  res.writeHead(status, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Type': req.headers.accept?.includes('application/json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' });
  if (req.headers.accept?.includes('application/json')) res.end(JSON.stringify({ ok, message }));
  else res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solicitud de incorporación</title><link rel="stylesheet" href="/styles.css"></head><body><main class="section container"><p class="eyebrow">Sociedad de Abogadas del Perú</p><h1>${ok ? 'Solicitud registrada' : 'Revisa tu solicitud'}</h1><p class="lead">${message}</p><a class="button primary" href="/unete.html#solicitud">Volver a incorporación</a></main></body></html>`);
}
export async function handleApplication(req, res, { file, port }) {
  if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return; }
  const allowedOrigins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  for (const origin of [process.env.SAPP_SITE_ORIGIN, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]) {
    if (origin) allowedOrigins.push(new URL(origin).origin);
  }
  if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) { feedback(req, res, 403, 'Envía la solicitud desde la web de la Sociedad.'); return; }
  const type = req.headers['content-type']?.split(';')[0];
  if (!['application/json', 'application/x-www-form-urlencoded'].includes(type)) { feedback(req, res, 415, 'Formato de solicitud no válido.'); return; }
  try {
    let body = '';
    for await (const chunk of req) { body += chunk.toString(); if (Buffer.byteLength(body) > 12000) { feedback(req, res, 413, 'La solicitud es demasiado extensa.'); return; } }
    const data = type === 'application/json' ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
    if (!data || typeof data !== 'object' || Array.isArray(data)) { feedback(req, res, 400, 'La solicitud no es válida.'); return; }
    const record = {};
    for (const [key, max] of Object.entries({ name: 120, email: 254, phone: 25, location: 100, college: 120, collegeNumber: 30, area: 80, motivation: 1200 })) {
      record[key] = typeof data[key] === 'string' ? data[key].trim() : '';
      if (record[key].length > max || (key !== 'motivation' && !record[key])) { feedback(req, res, 400, 'Completa los datos obligatorios dentro del tamaño permitido.'); return; }
    }
    record.email = record.email.toLowerCase();
    if (record.name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email) || !/^[+\d() .-]{7,25}$/.test(record.phone) || record.phone.replace(/\D/g, '').length < 7 || !areas.has(record.area)) { feedback(req, res, 400, 'Revisa el nombre, correo, teléfono y especialidad.'); return; }
    if (![true, 'true', 'on'].includes(data.consent)) { feedback(req, res, 400, 'Necesitamos tu autorización para gestionar la solicitud.'); return; }
    const operation = queue.then(async () => {
      await mkdir(dirname(file), { recursive: true });
      let records;
      try { records = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; records = []; }
      if (!Array.isArray(records)) throw new Error('Invalid application storage');
      if (records.some(entry => entry.email === record.email && entry.status === 'pending')) return;
      records.push({ ...record, id: randomUUID(), status: 'pending', createdAt: new Date().toISOString(), consentVersion: 'admission-v1' });
      await writeFile(file + '.tmp', JSON.stringify(records, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
      await rename(file + '.tmp', file);
    });
    queue = operation.catch(() => {});
    await operation;
    feedback(req, res, 200, 'Tu solicitud quedó registrada para revisión. Gracias por tu interés en formar parte de la Sociedad.', true);
  } catch (error) { feedback(req, res, error instanceof SyntaxError ? 400 : 503, error instanceof SyntaxError ? 'La solicitud no es válida.' : 'No pudimos guardar tu solicitud. Inténtalo de nuevo más tarde.'); }
}
