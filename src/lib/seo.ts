import type { Metadata } from "next";
import { SITE } from "@/lib/site";

type Options = {
  title: string;
  description: string;
  /** Path of the page, e.g. "/villas/lot-09". Resolved against metadataBase. */
  path: string;
  /** Use the title as-is instead of the "%s · Regal Victoria Lakeside" template (home page). */
  absoluteTitle?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Complete metadata for a public page: canonical URL, Open Graph and Twitter card.
 *
 * Never add `images` here. Next.js only applies a folder's opengraph-image file when the page's
 * openGraph has no `images` key, and metadata merging is shallow, so setting it (even to
 * undefined) would drop the generated share image. Twitter images are filled in from Open Graph.
 */
export function pageMetadata({ title, description, path, absoluteTitle, type = "website", publishedTime, modifiedTime }: Options): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE.name}`;
  const base = { siteName: SITE.name, locale: "en_LK", url: path, title: fullTitle, description };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph:
      type === "article"
        ? { ...base, type: "article", publishedTime, modifiedTime, authors: [SITE.name] }
        : { ...base, type: "website" },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

/** Absolute URL on the production domain. */
export const absoluteUrl = (path: string) => new URL(path, SITE.url).toString();
