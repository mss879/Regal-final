export const SITE = {
  name: "Regal Victoria Lakeside",
  short: "RVL",
  tagline: "Your private retreat where paradise begins.",
  location: "Digana, Kandy · Sri Lanka",
  url: "https://regalvictorialakeside.com",
  description:
    "A rare collection of fully furnished contemporary villas on an elevated site overlooking the Victoria Reservoir, in the heart of Kandy's exclusive Victoria District.",
  address: "7/1/D Kosambewatta, Digana, Rajawella",
  phone: "077-373-8943",
  phoneHref: "tel:+94773738943",
  email: "info@regalpropertysl.com",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kosambewatta%2C+Digana%2C+Rajawella%2C+Sri+Lanka",
  disclaimer: "All artists' impressions, photos and illustrations are indicative, and presented for illustration purposes only.",
} as const;

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/villas", label: "Villas" },
  { href: "/contact", label: "Contact" },
] as const;

/** Footer "Explore" links: the navbar plus pages that aren't in it. */
export const FOOTER_EXPLORE = [
  ...NAV.slice(0, 2),
  { href: "/#master-plan", label: "Master plan" },
  ...NAV.slice(2),
  { href: "/brochure", label: "Brochure" },
  { href: "/guides", label: "Guides" },
] as const;

/**
 * Social profiles shown in the footer.
 * TODO before launch: replace these placeholder URLs with the real Instagram and Facebook pages,
 * then set `placeholder: false` so they are also listed in the search-engine schema (sameAs).
 */
export const SOCIAL = [
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/regalvictorialakeside", placeholder: true },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/regalvictorialakeside", placeholder: true },
] as const;

/** Website and AI assistant credit (a normal, followed link — it should pass search value to ARC AI). */
export const CREDIT = {
  name: "ARC AI",
  url: "https://www.arcai.agency",
  title: "ARC AI — websites, SEO and AI agents",
  logoLight: { src: "/arc-ai/arc-ai-light.webp", width: 318, height: 76 },
  logoDark: { src: "/arc-ai/arc-ai-dark.webp", width: 465, height: 106 },
} as const;

export const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/terms-of-use", label: "Terms of use" },
  { href: "/cookie-policy", label: "Cookie policy" },
] as const;

export const COPY = {
  intro:
    "Your villa on a breathtaking private lakefront in the heart of Kandy's exclusive Victoria District.",
  collection:
    "Discover a rare collection of fully furnished contemporary villas, perfectly poised on an elevated site overlooking the serene expanse of the Victoria Reservoir.",
  neighbourhood:
    "Set within one of Digana's most coveted neighbourhoods—home to world-class leisure, golfing, and wellness experiences—this exclusive villa enclave promises both privilege and peace.",
  harmony:
    "Designed to harmonize contemporary architectural elegance with the tranquility of nature, Regal Victoria Lakeside offers a sanctuary where refined living meets panoramic beauty.",
  terraces:
    "Private terraces and landscaped gardens invite you to unwind in absolute privacy, surrounded by cooling forest breezes and the gentle rhythm of lakeside life.",
  glazing:
    "Floor-to-ceiling glazing, airy open-plan interiors, premium finishes, and meticulously crafted details create an atmosphere of understated luxury.",
  light:
    "Designs that elevate everyday living with abundant natural light, generous volumes, and a harmonious dialogue between contemporary architecture and the surrounding lakeside setting.",
  community: "A serene residential environment that promotes healthy living and a strong sense of community.",
  release: "A limited selection of premium villas now released.",
  releaseDetail:
    "Each villa is fully furnished, luxuriously landscaped, and positioned to maximize lake views and privacy.",
} as const;

// Each detail says what residents can do there.
export const AMENITIES = [
  { title: "Victoria Clubhouse", detail: "Enjoy the billiards room, bar and spa facilities, or meet friends, work and unwind" },
  { title: "Padel court", detail: "Play padel with friends and neighbours: fast, social and easy to pick up" },
  {
    title: "Infinity swimming pool on the rocks",
    detail: "Swim beside the rocks with the reservoir beyond, lounge on the deck and enjoy a drink at the pool bar",
  },
  { title: "400 m jogging track", detail: "Jog, run or take an evening walk on a track shaded by natural greenery" },
  { title: "Open-air gym", detail: "Work out in the fresh air with views across the reservoir" },
  { title: "Boating on the lake", detail: "Take a boat out on the Victoria Reservoir, right on your doorstep" },
  { title: "24-hour security", detail: "Relax in a gated, private enclave watched over around the clock" },
  { title: "Property management", detail: "Leave your villa's upkeep to optional management services while you're away" },
  { title: "High-speed internet", detail: "Work remotely, stream and stay connected from your villa" },
] as const;

export const LANDMARKS = [
  "Kandy",
  "Digana town",
  "Pallekele International Cricket Stadium",
  "Victoria Golf & Country Club",
  "Santani Wellness Resort & Spa",
  "Earl's Regency",
  "Jetwing Kandy Gallery",
] as const;

export const TEAM = {
  developer: {
    role: "Developer",
    name: "E.M.S Leisure Holdings (Pvt) Ltd",
    body: "With a distinguished multi-decade track record in personalized residential developments, E.M.S Leisure Holdings is known for crafting homes that combine thoughtful design, quality construction, and long-term value.",
  },
  architect: {
    role: "Architect",
    name: "teaM Architrave",
    place: "Colombo, Sri Lanka",
    url: "https://www.madhuraprematilleke.com",
    urlLabel: "madhuraprematilleke.com",
    body: "Internationally recognized, award-winning architectural practice, led by Madhura Prematilleke, renowned for contemporary, environmentally attuned design sensitive to nature and context.",
  },
} as const;

/** Amenity markers on the site plan, in map pixel space (1536 × 1024). */
export const MAP_PINS = [
  { id: "club", label: "Victoria Clubhouse", detail: "Billiards room, bar and spa facilities", x: 776, y: 282 },
  { id: "pool", label: "Infinity swimming pool on the rocks", detail: "14.5 m infinity pool with deck & pool bar", x: 718, y: 724 },
  { id: "gym", label: "Open-air gym", detail: "Overlooking the reservoir", x: 652, y: 882 },
] as const;
