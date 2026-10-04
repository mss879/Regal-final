import { IMAGES } from "@/lib/images";
import { OG_CONTENT_TYPE, OG_SIZE, renderOg } from "@/lib/og/render";

export const alt = "About Regal Victoria Lakeside — a gated enclave of contemporary villas on the Victoria Reservoir, Kandy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOg({ eyebrow: "About the enclave", title: "Where luxury", accent: "meets serenity", detail: "15 contemporary villas · Digana, Kandy", image: IMAGES.about.hero });
}
