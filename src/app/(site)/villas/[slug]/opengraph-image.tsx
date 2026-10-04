import { getVilla, formatSqft, STATUS_LABEL, VILLAS } from "@/lib/lots";
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og/render";

export const alt = "A fully furnished lakefront villa at Regal Victoria Lakeside, Digana, Kandy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return VILLAS.map((v) => ({ slug: v.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const villa = getVilla(slug)!;
  return renderOg({
    eyebrow: STATUS_LABEL[villa.status],
    title: villa.label,
    accent: `${villa.bedrooms} bedroom villa`,
    detail: `${villa.perches} perches · ${formatSqft(villa.areas!.total)} ft² · Fully furnished`,
    image: villa.hero,
  });
}
