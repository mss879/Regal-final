import { IMAGES } from "@/lib/images";
import { SITE } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og/render";

export const alt = "Contact Regal Victoria Lakeside and book a site visit in Digana, Kandy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOg({ eyebrow: "Contact · Site visits", title: "Let's talk", accent: "about home", detail: `${SITE.phone} · ${SITE.email}`, image: IMAGES.contactTexture });
}
