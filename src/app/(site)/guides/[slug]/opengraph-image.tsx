import { GUIDES, getGuide } from "@/lib/guides";
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og/render";

export const alt = "A guide from Regal Victoria Lakeside, Digana, Kandy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug)!;
  return renderOg({ eyebrow: guide.eyebrow, title: guide.title.lead, accent: guide.title.accent, image: guide.hero });
}
