import { render } from "./lots";

// Every site-wide image choice in one place. Sources, sharpest first:
//   pool renders            1680 px   /images/amenities/pool/design-NN.jpg
//   villa cover render      1584 px   /images/brochure/hero-villa.jpg
//   booklet renders    1080–1410 px   render(slug, slide)
//   brochure villa pages    1123 px   /images/lots/<slug>/hero.jpg (portrait)
// Brochure photos are small (~420-880 px) and the real reservoir photos are soft video
// stills, so only the brochure's satellite map and three amenity photos are used, and only
// where they display small (see `small` and `satellite`).

export const IMAGES = {
  hero: "/images/brochure/hero-villa.jpg",
  triptych: [
    { src: render("lot-11", 13), title: "Floor-to-ceiling glazing", body: "Airy open-plan interiors framing the reservoir and the hills beyond." },
    { src: render("lot-14-15", 10), title: "The living room", body: "Generous volumes, premium finishes and a garden on every side." },
    // Lot 14 & 15 master bedroom (labelled "Master bedroom" in the brochure).
    { src: render("lot-14-15", 20), title: "Master bedrooms", body: "Calm, generous suites with a writing desk, reading chair and a garden outlook." },
  ],
  showcase: "/images/amenities/pool/design-04.jpg",
  cta: render("lot-20", 11),
  amenities: {
    feature: "/images/amenities/pool/design-06.jpg",
    grid: [
      { src: "/images/amenities/pool/design-05.jpg", alt: "Swimming in the infinity pool on the rocks" },
      { src: "/images/amenities/pool/design-07.jpg", alt: "The pool bar overlooking the reservoir" },
      { src: "/images/amenities/pool/design-08.jpg", alt: "Loungers beside the rock channel" },
      { src: "/images/amenities/pool/design-09.jpg", alt: "The pool's infinity edge" },
    ],
  },
  about: {
    hero: render("lot-14-15", 7),
    setting: render("lot-14-15", 24),
    architecture: render("lot-14-15", 25),
    interiors: render("lot-14-15", 12),
    strip: ["/images/amenities/pool/design-04.jpg", "/images/amenities/pool/design-05.jpg", "/images/amenities/pool/design-07.jpg"],
  },
  // Low-resolution sources: keep their display width at or below ~300 CSS px.
  small: {
    jogging: "/images/amenities/jogging-track.jpg",
    padel: "/images/amenities/pickleball.jpg",
    gym: "/images/amenities/open-air-gym.jpg",
  },
  satellite: "/images/brochure/location-satellite.jpg",
  contactTexture: "/images/amenities/pool/design-04.jpg",
  notFound: render("lot-14-15", 24),
} as const;
