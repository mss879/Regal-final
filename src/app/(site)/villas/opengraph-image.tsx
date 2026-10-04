import { lotCounts } from "@/lib/lots";
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og/render";

export const alt = "The villa collection at Regal Victoria Lakeside — fully furnished lakefront villas in Kandy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOg({
    eyebrow: "Villa collection",
    title: "The villa",
    accent: "collection",
    detail: `${lotCounts().released} villas released · 2 to 4 bedrooms`,
    image: "/images/lots/lot-20/hero.jpg",
  });
}
