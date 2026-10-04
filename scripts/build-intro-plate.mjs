// Converts the expressway photographs behind the home-page intro (scripts/intro-src/*.png)
// into the web files the overlay loads from public/intro. Run by hand; the output is committed.
//
//   npm run intro:plate
//
// They live in public/intro, not public/images: `npm run assets -- --prune` deletes anything
// in public/images that build-assets.mjs did not generate.
//
// After replacing a photograph, re-measure its vanishing point and lane line and update the
// --px / --py / --pa / --mid values in src/components/intro/intro.css.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("scripts/intro-src");
const OUT = path.resolve("public/intro");

// The sources are 1344 px (landscape) and 752 px (portrait) wide. A modest Lanczos enlargement
// with light sharpening holds up better on screen than the browser's own upscaling.
const PLATES = [
  { name: "expressway-landscape", width: 1920 },
  { name: "expressway-portrait", width: 900 },
];

await fs.mkdir(OUT, { recursive: true });
for (const { name, width } of PLATES) {
  const base = sharp(path.join(SRC, `${name}.png`))
    .resize({ width, kernel: "lanczos3" })
    .sharpen({ sigma: 0.7, m1: 0.5, m2: 1.5 });
  const avif = await base.clone().avif({ quality: 50, effort: 7 }).toFile(path.join(OUT, `${name}.avif`));
  const webp = await base.clone().webp({ quality: 72, effort: 6 }).toFile(path.join(OUT, `${name}.webp`));
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`${name}: ${avif.width}x${avif.height}  avif ${kb(avif.size)}  webp ${kb(webp.size)}`);
}
