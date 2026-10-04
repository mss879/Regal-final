import type { MetadataRoute } from "next";
import { IMAGES } from "./images";
import { GUIDES } from "./guides";
import { VILLAS, villasInOrder } from "./lots";

// Every public, indexable page. The sitemap is built from this list, and the analytics
// endpoint only records page views for these paths.
type PublicRoute = {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  lastModified: string;
  images?: string[];
};

/** Bump when page content changes, so search engines recrawl. */
export const SITE_UPDATED = "2026-10-04";

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/", priority: 1, changeFrequency: "weekly", lastModified: SITE_UPDATED, images: [IMAGES.hero, IMAGES.showcase] },
  { path: "/villas", priority: 0.9, changeFrequency: "weekly", lastModified: SITE_UPDATED, images: villasInOrder().map((v) => v.hero!) },
  ...VILLAS.map((v) => ({
    path: `/villas/${v.slug}`,
    priority: 0.9,
    changeFrequency: "monthly" as const,
    lastModified: SITE_UPDATED,
    images: [v.hero!],
  })),
  { path: "/about", priority: 0.7, changeFrequency: "monthly", lastModified: SITE_UPDATED, images: [IMAGES.about.hero] },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly", lastModified: SITE_UPDATED },
  { path: "/brochure", priority: 0.6, changeFrequency: "monthly", lastModified: SITE_UPDATED, images: ["/images/brochure/cover.jpg"] },
  { path: "/guides", priority: 0.7, changeFrequency: "monthly", lastModified: SITE_UPDATED },
  ...GUIDES.map((g) => ({
    path: `/guides/${g.slug}`,
    priority: 0.8,
    changeFrequency: "monthly" as const,
    lastModified: g.updated,
    images: [g.hero],
  })),
  { path: "/privacy-policy", priority: 0.2, changeFrequency: "yearly", lastModified: SITE_UPDATED },
  { path: "/terms-of-use", priority: 0.2, changeFrequency: "yearly", lastModified: SITE_UPDATED },
  { path: "/cookie-policy", priority: 0.2, changeFrequency: "yearly", lastModified: SITE_UPDATED },
];

export const PUBLIC_PATHS = new Set(PUBLIC_ROUTES.map((r) => r.path));
