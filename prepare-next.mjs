import { cp, mkdir, copyFile } from 'node:fs/promises';

await mkdir('public/assets', { recursive: true });
await cp('dist/assets', 'public/assets', { recursive: true, force: true });
await copyFile('dist/app.js', 'public/app.js');
await copyFile('dist/styles.css', 'public/styles.css');
await copyFile('dist/styles.css', 'app/globals.css');
