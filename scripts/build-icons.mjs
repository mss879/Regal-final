// Favicons, app icons and share-image assets, all drawn from the brand emblem
// (public/images/brand/emblem-mask.png, an alpha mask). Run by hand: `npm run icons`.
// The output is committed.
//
//   src/app/favicon.ico            16, 32, 48 px (PNG entries in an ICO container)
//   src/app/icon1.png, icon2.png   96 and 192 px (Google Search wants multiples of 48)
//   src/app/apple-icon.png         180 px, opaque (iOS rounds the corners itself)
//   public/icons/                  192 / 512 px manifest icons + a 512 px maskable icon
//   src/assets/og/                 emblem + logo artwork and fonts for the share images
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const FOREST = "#12231a";
const LIME = [0xc5, 0xdc, 0x9f];
const PAPER = [0xfa, 0xf7, 0xf1];

const EMBLEM = "public/images/brand/emblem-mask.png";
const LOGO = "public/images/brand/logo-mask.png";

/** The emblem's alpha channel as a greyscale image, minus the soft band along its top edge. */
async function emblemAlpha({ erode = 0 } = {}) {
  const meta = await sharp(EMBLEM).metadata();
  const top = 6;
  let img = sharp(EMBLEM)
    .extract({ left: 0, top, width: meta.width, height: meta.height - top })
    .extractChannel("alpha");
  // At tiny sizes the white channels between the contours vanish. Eroding the mark (blur, then
  // a high threshold) widens them so the emblem still reads as stripes, not a solid block.
  if (erode) img = img.blur(erode).threshold(200);
  return img.png().toBuffer();
}

/** A solid-colour RGBA image whose alpha comes from a greyscale mask. */
async function tint(maskPng, rgb, height) {
  const { data, info } = await sharp(maskPng)
    .resize({ height, kernel: "lanczos3" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    out[i * 4] = rgb[0];
    out[i * 4 + 1] = rgb[1];
    out[i * 4 + 2] = rgb[2];
    out[i * 4 + 3] = data[i];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Lime emblem centred on a forest tile. `radius` is a fraction of the size (0 = square). */
async function tile(size, { scale, radius = 0, erode = 0 }) {
  const mark = await tint(await emblemAlpha({ erode }), LIME, Math.round(size * scale));
  const r = Math.round(size * radius);
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${FOREST}"/></svg>`,
  );
  return sharp(bg).composite([{ input: mark, gravity: "centre" }]).png({ compressionLevel: 9 }).toBuffer();
}

/** ICO container holding PNG images (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

async function write(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  console.log(`  ${file}  ${(data.length / 1024).toFixed(1)} KB`);
}

console.log("Icons");
const favicons = await Promise.all([
  { size: 16, scale: 0.84, erode: 26 },
  { size: 32, scale: 0.8, erode: 14 },
  { size: 48, scale: 0.76, erode: 6 },
].map(async (o) => ({ size: o.size, data: await tile(o.size, { scale: o.scale, radius: 0.2, erode: o.erode }) })));
await write("src/app/favicon.ico", ico(favicons));
await write("src/app/icon1.png", await tile(96, { scale: 0.7, radius: 0.22, erode: 3 }));
await write("src/app/icon2.png", await tile(192, { scale: 0.66, radius: 0.22 }));
await write("src/app/apple-icon.png", await tile(180, { scale: 0.6 }));
await write("public/icons/icon-192.png", await tile(192, { scale: 0.66, radius: 0.22 }));
await write("public/icons/icon-512.png", await tile(512, { scale: 0.64, radius: 0.22 }));
// Maskable: full bleed, with the mark inside the central safe zone (a circle of 80% diameter).
await write("public/icons/icon-maskable-512.png", await tile(512, { scale: 0.5 }));

console.log("Share-image assets");
await write("src/assets/og/emblem-lime.png", await tint(await emblemAlpha(), LIME, 240));
const logoAlpha = await sharp(LOGO).extractChannel("alpha").png().toBuffer();
await write("src/assets/og/logo-paper.png", await tint(logoAlpha, PAPER, 150));

const fonts = [
  ["@fontsource/jost/files/jost-latin-300-normal.woff", "jost-300.woff"],
  ["@fontsource/jost/files/jost-latin-400-normal.woff", "jost-400.woff"],
  ["@fontsource/jost/files/jost-latin-500-normal.woff", "jost-500.woff"],
  ["@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff", "cormorant-400-italic.woff"],
];
for (const [from, to] of fonts) await write(`src/assets/og/fonts/${to}`, await fs.readFile(require.resolve(from)));
