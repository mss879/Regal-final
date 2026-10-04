// One-time asset pipeline: crops the photographs out of the brochure slides and
// converts the lot booklets / pool renders / site map into web-sized files under
// public/images. Originals in assets-source/CATALOGUES (outside public/, so they are never deployed) are never modified.
//
// Image quality rule: large slots on the site use the booklet renders (~1100-1350 px,
// auto-cropped out of their white page frames) and the pool renders (1680 px). The
// brochure's own photos are small (its 2x3 grids are ~420 px wide), so only a few are
// kept, for slots that display them small.
//
//   npm run assets          # writes anything that is missing
//   npm run assets:force    # rewrites everything
//   npm run assets -- --prune   # also deletes generated images nothing produces any more
//   SRC_ROOT=../catalogues npm run assets   # originals moved out of public/
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const FORCE = process.argv.includes("--force");
const PRUNE = process.argv.includes("--prune");
const SRC_ROOT = path.resolve(process.env.SRC_ROOT ?? "assets-source/CATALOGUES");
const MAP_SRC = path.resolve(process.env.MAP_SRC ?? "assets-source/the-map.png");
const OUT_ROOT = path.resolve("public/images");
const MANIFEST = path.resolve("src/lib/generated/assets.json");

const BROCHURE_DIR = "RVL BROCHURE -PORTRAIT 22.09.2026";
const CONCURRENCY = 4;
const JPEG = { quality: 82, mozjpeg: true };

// ---------------------------------------------------------------------------
// Brochure crops. Boxes are {left, top, width, height} on 1123x1584 slides.
const CROPS = [
  // slide 1: full cover for the brochure thumbnail
  { slide: 1, out: "brochure/cover.jpg", maxWidth: 900 },
  // The only satellite/location map (884 px) — displayed at most ~700 CSS px wide.
  { slide: 2, out: "brochure/location-satellite.jpg", box: { left: 114, top: 105, width: 884, height: 523 } },
  // Amenity photos that exist nowhere else (~418 px) — shown as small cards only.
  { slide: 6, out: "amenities/pickleball.jpg", box: { left: 114, top: 1097, width: 416, height: 286 } },
  { slide: 6, out: "amenities/open-air-gym.jpg", box: { left: 577, top: 1097, width: 418, height: 286 } },

  // Villa hero renders (full-bleed portrait pages): drop the status ribbon at the top and
  // the text band at the bottom. Portrait crops, 1123 px wide.
  { slide: 10, out: "lots/lot-14-15/hero.jpg", box: { left: 0, top: 168, width: 1123, height: 1100 } },
  { slide: 13, out: "lots/lot-20/hero.jpg", box: { left: 0, top: 238, width: 1123, height: 1030 } },
  { slide: 16, out: "lots/lot-09/hero.jpg", box: { left: 0, top: 162, width: 1123, height: 1106 } },
  { slide: 19, out: "lots/lot-10/hero.jpg", box: { left: 0, top: 162, width: 1123, height: 1106 } },
  { slide: 22, out: "lots/lot-11/hero.jpg", box: { left: 0, top: 162, width: 1123, height: 1106 } },

  // Brand
  { slide: 25, out: "brand/logo-dark.jpg", box: { left: 100, top: 90, width: 520, height: 235 }, trim: true },
];

// Booklet render and plan pages, auto-cropped out of their white page frame (see photoBox).
// Slide numbers per booklet, from a visual survey of every page.
const RENDERS = {
  "lot-09": [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
  "lot-10": [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  "lot-11": [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  "lot-14-15": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  "lot-20": [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
};
const PLANS = {
  "lot-09": [4, 5],
  "lot-10": [4, 5],
  "lot-11": [4, 5],
  "lot-14-15": [5, 6],
  "lot-20": [4, 5],
};

// Amenity photo from the layout page of the LOT 09 booklet (larger than the brochure's).
const BOOKLET_CROPS = [
  { src: "LOT 09/RVL LOT 09 BOOKLET/Slide3.PNG", out: "amenities/jogging-track.jpg", box: { left: 1085, top: 525, width: 460, height: 335 } },
];

// The full-page villa render on LOT 15 slide 2 (1584 px) is the sharpest wide image in the
// catalogues. (The LOT 20 cover's reservoir aerial is a soft video still with text baked
// in, so it isn't used.)
const LOT15_COVER = "LOT 14 AND 15/RVL LOT 15 BOOKLET/Slide2.PNG";
const COVER_CROPS = [
  { src: LOT15_COVER, out: "brochure/hero-villa.jpg", box: { left: 0, top: 0, width: 1584, height: 912 }, quality: 88 },
];

const BOOKLETS = [
  { dir: "LOT 09/RVL LOT 09 BOOKLET", slug: "lot-09", skip: [1, 2, 23] },
  { dir: "LOT 10/RVL LOT 10 BOOKLET", slug: "lot-10", skip: [1, 2, 21] },
  { dir: "LOT 11/RVL LOT 11 BOOKLET", slug: "lot-11", skip: [1, 2, 19] },
  { dir: "LOT 14 AND 15/RVL LOT 15 BOOKLET", slug: "lot-14-15", skip: [1, 3, 28] },
  { dir: "LOT 20/RVL LOT 20 BOOKLET", slug: "lot-20", skip: [1, 2, 20] },
];

const BROCHURE_SKIP = [7];
const POOL_SKIP = [1, 2];
// Renders 04-11 sit in a white slide frame with a heading and page number; crop to the photo.
const POOL_RENDER_BOX = { left: 345, top: 200, width: 1680, height: 1200 };

// ---------------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const rel = (abs) => "/" + path.relative(path.resolve("public"), abs).split(path.sep).join("/");

async function listSlides(dir) {
  const names = await fs.readdir(dir);
  const slides = [];
  for (const name of names) {
    const m = /^slide(\d+)\.png$/i.exec(name);
    if (m) slides.push({ n: Number(m[1]), file: path.join(dir, name) });
  }
  return slides.sort((a, b) => a.n - b.n);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Find the photo (or drawing) rectangle on a white booklet page: the longest band of rows
// that are mostly non-white, then the longest band of mostly non-white columns within it.
// Headings, page-number tabs and disclaimers are thin, so they fall outside both bands.
// Large gaps are bridged so bright skies and white walls inside a render don't split it.
async function photoBox(file) {
  const { data, info } = await sharp(file, { failOn: "none" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const ink = new Uint8Array(W * H); // 0 white, 1 content, 2 solid black
  for (let p = 0, i = 0; p < W * H; p++, i += C) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    ink[p] = r > 238 && g > 238 && b > 238 ? 0 : r < 14 && g < 14 && b < 14 ? 2 : 1;
  }
  const longest = (fr, thr, gap) => {
    let best = [0, -1];
    let start = -1;
    let last = -1;
    for (let i = 0; i < fr.length; i++) {
      if (fr[i] <= thr) continue;
      if (start < 0 || i - last > gap) start = i;
      last = i;
      if (last - start > best[1] - best[0]) best = [start, last];
    }
    return best;
  };
  const rowFrac = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    let n = 0;
    let k = 0;
    for (let x = 0; x < W; x++) {
      const v = ink[y * W + x];
      if (v === 1) n++;
      else if (v === 2) k++;
    }
    // A row that is mostly solid black (one render has a black band under it) isn't photo.
    rowFrac[y] = k / W > 0.6 ? 0 : (n + k) / W;
  }
  const [y0, y1] = longest(rowFrac, 0.3, 400);
  const colFrac = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (ink[y * W + x]) n++;
    colFrac[x] = n / (y1 - y0 + 1);
  }
  const [x0, x1] = longest(colFrac, 0.5, 60);
  if (x1 - x0 < 200 || y1 - y0 < 200) throw new Error(`no photo found in ${file}`);

  // Bridging gaps can pull in a caption printed just under the photo (the "* All artists'
  // impressions…" disclaimer). Photo edge rows are almost entirely non-white across the
  // photo's width, caption rows are not — so walk the top and bottom edges inward (a
  // short way) until they sit on a solid photo row.
  const solid = (y) => {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (ink[y * W + x]) n++;
    return n / (x1 - x0 + 1) > 0.9;
  };
  const reach = 160;
  let top = y0;
  let bottom = y1;
  for (let y = y0; y < Math.min(y0 + reach, y1); y++) if (solid(y)) { top = y; break; }
  for (let y = y1; y > Math.max(y1 - reach, top); y--) if (solid(y)) { bottom = y; break; }

  const inset = 3; // stay clear of anti-aliased frame edges
  return { left: x0 + inset, top: top + inset, width: x1 - x0 + 1 - inset * 2, height: bottom - top + 1 - inset * 2 };
}

async function listFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(p)));
    else out.push(p);
  }
  return out;
}

/** @type {{src:string,out:string,box?:object,maxWidth?:number,trim?:boolean,png?:boolean,quality?:number,manifest?:[string,string|null]}[]} */
const jobs = [];

const brochureSlides = await listSlides(path.join(SRC_ROOT, BROCHURE_DIR));
const brochureBy = new Map(brochureSlides.map((s) => [s.n, s.file]));
for (const c of CROPS) {
  const src = brochureBy.get(c.slide);
  if (!src) throw new Error(`Brochure slide ${c.slide} not found`);
  jobs.push({ src, out: path.join(OUT_ROOT, c.out), box: c.box, maxWidth: c.maxWidth, trim: c.trim });
}
for (const s of brochureSlides) {
  if (BROCHURE_SKIP.includes(s.n)) continue;
  jobs.push({
    src: s.file,
    out: path.join(OUT_ROOT, "brochure/slides", `slide-${pad(s.n)}.jpg`),
    maxWidth: 1400,
    manifest: ["brochure", null],
  });
}

for (const c of [...COVER_CROPS, ...BOOKLET_CROPS]) {
  jobs.push({ src: path.join(SRC_ROOT, c.src), out: path.join(OUT_ROOT, c.out), box: c.box, quality: c.quality });
}

for (const b of BOOKLETS) {
  const slides = await listSlides(path.join(SRC_ROOT, b.dir));
  if (slides.length === 0) throw new Error(`No slides in ${b.dir}`);
  const bySlide = new Map(slides.map((s) => [s.n, s.file]));
  for (const s of slides) {
    if (b.skip.includes(s.n)) continue;
    jobs.push({
      src: s.file,
      out: path.join(OUT_ROOT, "lots", b.slug, "booklet", `slide-${pad(s.n)}.jpg`),
      maxWidth: 1600,
      manifest: ["booklets", b.slug],
    });
  }
  for (const [group, list, quality] of [["renders", RENDERS[b.slug], 86], ["plans", PLANS[b.slug], 88]]) {
    for (const n of list ?? []) {
      const src = bySlide.get(n);
      if (!src) throw new Error(`${b.slug}: slide ${n} not found for ${group}`);
      jobs.push({
        src,
        out: path.join(OUT_ROOT, "lots", b.slug, group, `slide-${pad(n)}.jpg`),
        box: "auto",
        maxWidth: 1600,
        quality,
        slide: n,
        manifest: [group, b.slug],
      });
    }
  }
}

const poolDir = path.join(SRC_ROOT, "POOL");
for (const name of (await fs.readdir(poolDir)).sort()) {
  const m = /DESIGN-(\d+)\.png$/i.exec(name);
  if (!m) continue;
  const n = Number(m[1]);
  if (POOL_SKIP.includes(n)) continue;
  jobs.push({
    src: path.join(poolDir, name),
    out: path.join(OUT_ROOT, "amenities/pool", `design-${pad(n)}.jpg`),
    box: n >= 4 ? POOL_RENDER_BOX : undefined,
    maxWidth: 1800,
    manifest: ["pool", null],
  });
}

jobs.push({ src: MAP_SRC, out: path.join(OUT_ROOT, "map/site-plan.png"), png: true });

// Logo masks: the black-on-cream logo (slide 25) becomes a transparent PNG whose alpha is
// the ink, so the site can tint it with CSS `mask-image` (white on photos, forest on cream).
const logoSrc = brochureBy.get(25);
jobs.push({ src: logoSrc, out: path.join(OUT_ROOT, "brand/logo-mask.png"), box: { left: 100, top: 90, width: 520, height: 235 }, mask: true });
jobs.push({ src: logoSrc, out: path.join(OUT_ROOT, "brand/emblem-mask.png"), box: { left: 100, top: 100, width: 164, height: 188 }, mask: true });

// Phase 1: validate every source before writing anything.
const missing = [];
for (const j of jobs) if (!(await exists(j.src))) missing.push(j.src);
if (missing.length) {
  console.error("Missing sources:\n" + missing.join("\n"));
  process.exit(1);
}
for (const j of jobs) {
  const size = (await fs.stat(j.src)).size;
  if (size < 20 * 1024) console.warn(`warning: ${path.relative(SRC_ROOT, j.src)} is only ${size} bytes`);
}

// Phase 2: process with limited concurrency.
const stats = { written: 0, skipped: 0, failed: 0, bytes: 0 };
const manifest = { booklets: {}, renders: {}, plans: {}, brochure: [], pool: [], images: {} };

async function run(j) {
  await fs.mkdir(path.dirname(j.out), { recursive: true });
  if (!FORCE && (await exists(j.out))) {
    stats.skipped++;
  } else if (j.mask) {
    // Extract first, then trim in a second pipeline — sharp would otherwise trim the whole
    // slide before extracting, shifting the box.
    const cropped = await sharp(j.src).extract(j.box).toBuffer();
    const { data, info: raw } = await sharp(cropped)
      .trim({ threshold: 20 })
      .resize({ width: 1200, kernel: "lanczos3" })
      .greyscale()
      .negate()
      .linear(1.5, -60)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const info = await sharp({ create: { width: raw.width, height: raw.height, channels: 3, background: "#000" } })
      .joinChannel(data, { raw: { width: raw.width, height: raw.height, channels: 1 } })
      .png({ compressionLevel: 9 })
      .toFile(j.out);
    stats.written++;
    stats.bytes += info.size;
  } else {
    // failOn "none": one booklet slide (LOT 20 Slide9) has a damaged PNG tail but still decodes.
    let img = sharp(j.src, { failOn: "none" });
    if (j.box) img = img.extract(j.box === "auto" ? await photoBox(j.src) : j.box);
    if (j.trim) img = sharp(await img.toBuffer()).trim({ threshold: 20 });
    if (j.maxWidth) img = img.resize({ width: j.maxWidth, withoutEnlargement: true });
    img = j.png ? img.png({ compressionLevel: 9 }) : img.jpeg({ ...JPEG, quality: j.quality ?? JPEG.quality });
    const info = await img.toFile(j.out);
    stats.written++;
    stats.bytes += info.size;
  }
  const meta = await sharp(j.out).metadata();
  manifest.images[rel(j.out)] = [meta.width, meta.height];
  if (j.manifest) {
    const entry = { src: rel(j.out), width: meta.width, height: meta.height, ...(j.slide ? { slide: j.slide } : {}) };
    const [group, key] = j.manifest;
    if (key) (manifest[group][key] ??= []).push(entry);
    else manifest[group].push(entry);
  }
}

let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < jobs.length) {
      const j = jobs[cursor++];
      try {
        await run(j);
      } catch (err) {
        stats.failed++;
        console.error(`failed: ${path.relative(OUT_ROOT, j.out)} — ${err.message}`);
      }
    }
  }),
);

const bySrc = (a, b) => a.src.localeCompare(b.src);
manifest.brochure.sort(bySrc);
manifest.pool.sort(bySrc);
for (const group of ["booklets", "renders", "plans"]) {
  for (const k of Object.keys(manifest[group])) manifest[group][k].sort(bySrc);
}
manifest.images = Object.fromEntries(Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b)));
await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

console.log(
  `assets: ${stats.written} written, ${stats.skipped} skipped, ${stats.failed} failed, ${(stats.bytes / 1024 / 1024).toFixed(1)} MB written`,
);
if (stats.failed) process.exit(1);

// --prune: public/images is entirely generated by this script, so anything in it that no
// job produced any more is a stale output (e.g. a crop that was replaced by a better one).
if (PRUNE) {
  const produced = new Set(jobs.map((j) => path.resolve(j.out)));
  const stale = (await listFiles(OUT_ROOT)).filter((f) => !produced.has(path.resolve(f)));
  for (const f of stale) {
    await fs.unlink(f);
    console.log(`pruned ${path.relative(OUT_ROOT, f)}`);
  }
  console.log(`prune: ${stale.length} stale file(s) removed`);
}
