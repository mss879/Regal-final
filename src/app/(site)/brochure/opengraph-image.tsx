import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og/render";

export const alt = "The Regal Victoria Lakeside brochure — the setting, master plan, amenities and villas";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOg({ eyebrow: "Brochure", title: "The", accent: "brochure", detail: "Setting · Master plan · Amenities · Villas", image: "/images/brochure/cover.jpg" });
}
