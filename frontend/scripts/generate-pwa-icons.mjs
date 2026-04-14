/**
 * Generates PWA launcher icons using sharp (already a frontend dependency).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

const bg = '#0a0a0f';
const accent = '#6366f1';

async function makeIcon(size, { maskable } = { maskable: false }) {
  const pad = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - pad * 2;
  const r = Math.round(inner * 0.22);
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bg}"/>
      <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="${accent}" opacity="0.95"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
        font-family="system-ui,sans-serif" font-weight="700" font-size="${Math.round(inner * 0.28)}"
        fill="#ffffff">V</text>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

await mkdir(iconsDir, { recursive: true });
await writeFile(join(iconsDir, 'icon-192.png'), await makeIcon(192));
await writeFile(join(iconsDir, 'icon-512.png'), await makeIcon(512));
await writeFile(join(iconsDir, 'icon-maskable-512.png'), await makeIcon(512, { maskable: true }));
console.log('Wrote PWA icons to public/icons/');
