import { resolve } from 'node:path';

export async function runLegacyHandler(request, handler, storageEnv, defaultFile) {
  const body = Buffer.from(await request.arrayBuffer());
  const req = {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    async *[Symbol.asyncIterator]() { if (body.length) yield body; },
  };
  const res = {
    status: 200,
    headers: {},
    data: '',
    writeHead(status, headers = {}) { this.status = status; this.headers = headers; return this; },
    end(data = '') { this.data = data; return this; },
  };
  await handler(req, res, {
    file: resolve(process.env[storageEnv] || defaultFile),
    port: Number(process.env.PORT || 3000),
  });
  return new Response(res.data, { status: res.status, headers: res.headers });
}
