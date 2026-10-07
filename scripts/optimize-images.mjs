// Lossy WebP derivatives for display; original JPG/PNG files remain untouched.
// npm install --prefix /tmp/che-seo-tools sharp
// SHARP_MODULE=/tmp/che-seo-tools/node_modules/sharp node scripts/optimize-images.mjs
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)(process.env.SHARP_MODULE || 'sharp');
const root = fileURLToPath(new URL('../vers_2/assets/', import.meta.url));
let sourceBytes = 0;
let resultBytes = 0;
async function convert(source, target, width) {
  await sharp(root + source).resize({ width, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(root + target);
  sourceBytes += (await stat(root + source)).size;
  resultBytes += (await stat(root + target)).size;
}
await convert('brand/logo-full-dark.png', 'brand/logo-full-dark-small.webp', 340);
await convert('brand/logo-full-light.png', 'brand/logo-full-light-small.webp', 440);
await convert('brand/logo-light.png', 'brand/logo-light-small.webp', 200);
for (const name of await readdir(root + 'img/menu')) {
  if (!name.endsWith('.jpg')) continue;
  for (const width of [320, 640]) {
    await convert(`img/menu/${name}`, `img/menu/${name.replace('.jpg', `-${width}.webp`)}`, width);
  }
}
for (const name of await readdir(root + 'img/interior')) {
  if (!/-[st]\.jpg$/.test(name)) continue;
  await convert(`img/interior/${name}`, `img/interior/${name.replace('.jpg', '.webp')}`, name.endsWith('-t.jpg') ? 216 : 648);
}
// Intermediate sizes for the large first-screen gallery on high-density phones.
for (const name of ['okno-vecher', 'stol-kompaniya', 'okno-sobor', 'divany', 'dekor', 'cvety']) {
  await convert(`img/interior/${name}.jpg`, `img/interior/${name}-m.webp`, 432);
}
// Wide hall photo for the first screen: landscape for desktop, a 5:4 crop for phones.
await convert('img/hero/hero-1.jpg', 'img/hero/hero-1-800.webp', 800);
await convert('img/hero/hero-1.jpg', 'img/hero/hero-1-1280.webp', 1280);
// Главный снимок на телефоне — элемент LCP, поэтому 700 и 800 px сжаты сильнее (разница не видна).
for (const width of [480, 700, 800]) {
  await sharp(root + 'img/hero/hero-1.jpg').extract({ left: 449, top: 0, width: 1176, height: 941 })
    .resize({ width }).webp({ quality: width > 480 ? 60 : 78, effort: 6 }).toFile(root + `img/hero/hero-1-m${width}.webp`);
}
console.log(`Generated display images: ${Math.round(resultBytes / 1024)} KiB (source inputs: ${Math.round(sourceBytes / 1024)} KiB, originals preserved).`);
