import { notFound } from 'next/navigation';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import LegacyPage from './legacy-page';

export const dynamicParams = false;
const dist = join(process.cwd(), 'dist');

async function pageFile(path = []) {
  const requested = path.join('/') || 'index.html';
  const filename = requested === 'index.html' ? 'index.html' : requested;
  if (!/^[a-z0-9-]+\.html$/i.test(filename)) return null;
  try {
    const html = await readFile(join(dist, filename), 'utf8');
    const body = html.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
    if (!body) return null;
    const page = body[1].match(/data-page="([^"]+)"/)?.[1] || '';
    return { html: body[2], page, source: html };
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const files = await readdir(dist);
  return [{ path: [] }, ...files.filter((file) => file.endsWith('.html') && file !== 'index.html').map((file) => ({ path: [file] }))];
}

export async function generateMetadata({ params }) {
  const { path = [] } = await params;
  const page = await pageFile(path);
  if (!page) return {};
  const title = page.source.match(/<title>([^<]+)<\/title>/i)?.[1]?.split(' | ')[0];
  const description = page.source.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1];
  return { title, description, openGraph: { title, description, type: 'website' } };
}

export default async function Page({ params }) {
  const { path = [] } = await params;
  const page = await pageFile(path);
  if (!page) notFound();
  return <LegacyPage html={page.html} page={page.page} />;
}
