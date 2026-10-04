import manifest from "./generated/assets.json";
import type { Lot, VillaSlug } from "./lots";

// Written by scripts/build-assets.mjs — exact pixel sizes of every generated image.
export type Slide = { src: string; width: number; height: number; alt?: string };

type Entry = Slide & { slide?: number };

type Manifest = {
  booklets: Record<VillaSlug, Entry[]>;
  renders: Record<VillaSlug, Entry[]>;
  plans: Record<VillaSlug, Entry[]>;
  brochure: Entry[];
  pool: Entry[];
  images: Record<string, number[]>;
};

const data = manifest as Manifest;

export const bookletFor = (slug: VillaSlug): Slide[] => data.booklets[slug] ?? [];
export const brochureSlides = (): Slide[] => data.brochure;
export const poolSlides = (): Slide[] => data.pool;

/** Real pixel size of a generated image (throws if the pipeline didn't produce it). */
export function sizeOf(src: string): { width: number; height: number } {
  const dims = data.images[src];
  if (!dims) throw new Error(`Image not in the asset manifest: ${src} (run npm run assets)`);
  return { width: dims[0], height: dims[1] };
}

// Booklet crops in the villa's display order, with captions from lots.ts.
const pick = (entries: Entry[] | undefined, order: [number, string][] | undefined): Slide[] =>
  (order ?? []).flatMap(([slide, caption]) => {
    const e = entries?.find((x) => x.slide === slide);
    return e ? [{ src: e.src, width: e.width, height: e.height, alt: caption }] : [];
  });

export const rendersFor = (villa: Lot & { slug: VillaSlug }): Slide[] => pick(data.renders[villa.slug], villa.renders);
export const plansFor = (villa: Lot & { slug: VillaSlug }): Slide[] => pick(data.plans[villa.slug], villa.plans);
