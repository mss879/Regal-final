// Single source of truth for all 15 villa lots — master plan, cards, villa pages
// and the contact form all read from here. Figures are from the RVL brochure
// (22.09.2026) and the per-lot booklets.

export type LotStatus = "available" | "nearing-completion" | "design-stage" | "sold";

export type LotAreas = {
  internal: number;
  verandahs: number;
  parking?: number;
  steps?: number;
  total: number;
};

export type Lot = {
  id: string;
  label: string;
  phase: 1 | 2;
  status: LotStatus;
  /** Only released villas have a page. */
  slug?: VillaSlug;
  perches?: number;
  bedrooms?: number;
  areas?: LotAreas;
  tagline?: string;
  description?: string;
  /** Portrait exterior render (from the brochure's full-page villa slides). */
  hero?: string;
  /** Booklet renders in display order: [booklet slide number, caption] (see scripts/build-assets.mjs). */
  renders?: [number, string][];
  /** Booklet plan pages: [slide number, caption]. */
  plans?: [number, string][];
  /** Booklet render used as this villa's wide feature image. */
  feature?: number;
  /** Map hotspot polygon in site-plan pixel space (1536 × 1024). */
  polygon: [number, number][];
};

export type VillaSlug = "lot-09" | "lot-10" | "lot-11" | "lot-14-15" | "lot-20";

export const MAP_SIZE = { width: 1536, height: 1024 } as const;

const img = (slug: VillaSlug, file: string) => `/images/lots/${slug}/${file}`;

/** Path of a booklet render crop, e.g. render("lot-11", 13). */
export const render = (slug: VillaSlug, slide: number) =>
  `/images/lots/${slug}/renders/slide-${String(slide).padStart(2, "0")}.jpg`;

export const LOTS: Lot[] = [
  // ---- Phase 02 --------------------------------------------------------------
  {
    id: "2",
    label: "Lot 02",
    phase: 2,
    status: "sold",
    polygon: [[274, 8], [434, 40], [405, 150], [378, 220], [286, 195]],
  },
  {
    id: "3",
    label: "Lot 03",
    phase: 2,
    status: "design-stage",
    polygon: [[434, 40], [562, 65], [527, 230], [460, 215], [424, 196], [435, 160], [405, 152]],
  },
  {
    id: "4",
    label: "Lot 04",
    phase: 2,
    status: "design-stage",
    polygon: [[562, 65], [687, 108], [659, 260], [527, 230]],
  },
  {
    id: "7",
    label: "Lot 07",
    phase: 2,
    status: "design-stage",
    polygon: [[286, 220], [372, 240], [317, 425], [185, 390], [190, 330], [210, 300]],
  },
  {
    id: "9",
    slug: "lot-09",
    label: "Lot 09",
    phase: 2,
    status: "available",
    perches: 20,
    bedrooms: 3,
    areas: { internal: 2255, verandahs: 603, total: 2858 },
    tagline: "Waterfront, directly above the lake edge",
    description:
      "A rare 20-perch waterfront home positioned directly above the lake edge. Fully furnished and enhanced with a curated landscaped garden, offering an intimate lakeside living experience.",
    hero: img("lot-09", "hero.jpg"),
    feature: 10,
    renders: [
      [7, "Aerial — the villa on its point above the water"],
      [8, "Aerial — the planted roof"],
      [9, "Arrival court"],
      [10, "Lakeside façade"],
      [11, "Garden terrace"],
      [12, "Cantilevered living pavilion"],
      [13, "The long façade and lawn"],
      [14, "Carport and entrance"],
      [15, "Entrance"],
      [16, "A framed view of the lake"],
      [17, "Living room"],
      [18, "Pantry + dining"],
      [19, "Living and dining"],
      [20, "Verandah over the water"],
      [21, "Looking out from the living room"],
      [22, "Side verandah"],
      [6, "Elevation"],
    ],
    plans: [[4, "Layout plan — ground floor"], [5, "Layout plan — roof"]],
    polygon: [[185, 390], [317, 425], [257, 615], [162, 590], [165, 450]],
  },
  {
    id: "10",
    slug: "lot-10",
    label: "Lot 10",
    phase: 2,
    status: "available",
    perches: 20,
    bedrooms: 2,
    areas: { internal: 1530, verandahs: 620, total: 2150 },
    tagline: "Two bedrooms, terraced garden, reservoir vistas",
    description:
      "A two-bedroom contemporary villa positioned to capture sweeping vistas of the Victoria Reservoir. Fully furnished, with a terraced landscaped garden ideal for outdoor living.",
    hero: img("lot-10", "hero.jpg"),
    feature: 17,
    renders: [
      [17, "Garden façade"],
      [18, "Terraced garden"],
      [6, "Arrival court"],
      [7, "From the street"],
      [19, "Entrance hedge"],
      [20, "Aerial — arrival court"],
      [9, "Living room"],
      [10, "Living room — garden view"],
      [11, "Pantry + dining"],
      [8, "Dining"],
      [12, "Bedroom — lake view"],
      [13, "Bedroom"],
      [14, "Bedroom — garden view"],
      [15, "Garden verandah"],
      [16, "Verandah"],
    ],
    plans: [[4, "Layout plan — ground floor"], [5, "Layout plan — roof"]],
    polygon: [[402, 268], [430, 248], [650, 294], [640, 330], [592, 382], [380, 335]],
  },
  {
    id: "11",
    slug: "lot-11",
    label: "Lot 11",
    phase: 2,
    status: "available",
    perches: 20,
    bedrooms: 2,
    areas: { internal: 1535, verandahs: 560, total: 2095 },
    tagline: "Two bedrooms among the pines",
    description:
      "A two-bedroom contemporary villa positioned to capture sweeping vistas of the Victoria Reservoir. Fully furnished, with a terraced landscaped garden ideal for outdoor living.",
    hero: img("lot-11", "hero.jpg"),
    feature: 9,
    renders: [
      [9, "Garden elevation"],
      [7, "Garden façade"],
      [6, "Arrival"],
      [8, "Stone stair"],
      [18, "Aerial — arrival court"],
      [13, "Living room — lake view"],
      [10, "Living room"],
      [11, "Pantry + dining"],
      [12, "Living + dining"],
      [15, "Bedroom — lake view"],
      [14, "Bedroom"],
      [16, "Bedroom — garden view"],
      [17, "Verandah"],
    ],
    plans: [[4, "Layout plan — ground floor"], [5, "Layout plan — roof"]],
    polygon: [[380, 335], [592, 382], [585, 475], [355, 427]],
  },
  {
    id: "14-15",
    slug: "lot-14-15",
    label: "Lot 14 & 15",
    phase: 2,
    status: "available",
    perches: 40,
    bedrooms: 4,
    areas: { internal: 2925, verandahs: 875, total: 3800 },
    tagline: "The flagship — four bedrooms on 40 perches",
    description:
      "A prime four-bedroom residence on an expansive 40-perch lakefront site, featuring fully furnished interiors, extensive landscaped gardens, and unobstructed water views. Designed for families seeking space, serenity, luxury and privacy.",
    hero: img("lot-14-15", "hero.jpg"),
    feature: 8,
    renders: [
      [7, "Aerial — planted roofs and gardens"],
      [8, "Garden façade"],
      [9, "The living pavilion"],
      [27, "Rear elevation"],
      [10, "Living room — lake view"],
      [11, "Living room"],
      [12, "Living room and dining"],
      [13, "Living and dining"],
      [14, "Pantry and dining"],
      [15, "Kitchen and dining"],
      [16, "Garden stair"],
      [17, "Upper lounge"],
      [18, "TV lounge"],
      [19, "Master bedroom"],
      [20, "Master bedroom"],
      [21, "Master bedroom washroom"],
      [22, "Bathroom"],
      [23, "Bedroom — garden view"],
      [24, "Across the reservoir"],
      [25, "Verandah"],
      [26, "Upper garden"],
    ],
    plans: [[5, "Entry level plan"], [6, "Upper level plan"]],
    polygon: [[355, 427], [585, 475], [612, 595], [337, 628], [340, 598], [313, 552]],
  },

  // ---- Phase 01 --------------------------------------------------------------
  {
    id: "12",
    label: "Lot 12",
    phase: 1,
    status: "sold",
    polygon: [[630, 377], [892, 390], [895, 455], [957, 525], [880, 572], [767, 615], [630, 640], [617, 595], [590, 470]],
  },
  {
    id: "17",
    label: "Lot 17",
    phase: 1,
    status: "sold",
    polygon: [[452, 615], [630, 640], [662, 785], [600, 778], [520, 742]],
  },
  {
    id: "19",
    label: "Lot 19",
    phase: 1,
    status: "sold",
    polygon: [[767, 615], [880, 572], [955, 715], [860, 760], [812, 765]],
  },
  {
    id: "20",
    slug: "lot-20",
    label: "Lot 20",
    phase: 1,
    status: "nearing-completion",
    perches: 20,
    bedrooms: 3,
    areas: { internal: 2134, verandahs: 642, parking: 512, steps: 104, total: 3392 },
    tagline: "Nearing completion — cantilevered over the reservoir",
    description:
      "A commanding three-bedroom contemporary villa positioned to capture sweeping vistas of the Victoria Reservoir. Fully furnished, with a terraced landscaped garden ideal for outdoor living.",
    hero: img("lot-20", "hero.jpg"),
    feature: 7,
    renders: [
      [7, "Street approach"],
      [8, "Cantilevered façade"],
      [6, "Aerial — the lakeside cluster"],
      [9, "Carport"],
      [11, "Living room — lake view"],
      [10, "Living and dining"],
      [12, "Living and dining"],
      [13, "Living room"],
      [14, "Breakfast bar"],
      [15, "Kitchen"],
      [16, "Kitchen + pantry"],
      [17, "Terrace"],
      [18, "Entry court"],
      [19, "Courtyard"],
    ],
    plans: [[4, "Entry level plan"], [5, "Lower level plan"]],
    polygon: [[880, 572], [957, 525], [1075, 640], [1068, 665], [955, 715]],
  },
  {
    id: "21",
    label: "Lot 21",
    phase: 1,
    status: "sold",
    polygon: [[702, 815], [870, 792], [935, 765], [975, 842], [855, 900], [727, 907]],
  },
  {
    id: "23",
    label: "Lot 23",
    phase: 1,
    status: "sold",
    polygon: [[935, 765], [1100, 685], [1122, 690], [1177, 752], [975, 842]],
  },
  {
    id: "24",
    label: "Lot 24",
    phase: 1,
    status: "sold",
    polygon: [[1202, 802], [1257, 770], [1465, 922], [1372, 985], [1232, 865]],
  },
];

export const VILLAS = LOTS.filter((l): l is Lot & { slug: VillaSlug } => Boolean(l.slug));

export const VILLA_ORDER: VillaSlug[] = ["lot-14-15", "lot-20", "lot-09", "lot-10", "lot-11"];

export const villasInOrder = () =>
  VILLA_ORDER.map((s) => VILLAS.find((v) => v.slug === s)!);

export const getVilla = (slug: string) => VILLAS.find((v) => v.slug === slug);

export const STATUS_LABEL: Record<LotStatus, string> = {
  available: "Pre-booking",
  "nearing-completion": "Nearing completion",
  "design-stage": "Design stage",
  sold: "Sold",
};

export const isOpen = (s: LotStatus) => s === "available" || s === "nearing-completion";

export const lotCounts = () => ({
  total: LOTS.length,
  sold: LOTS.filter((l) => l.status === "sold").length,
  released: VILLAS.length,
  designStage: LOTS.filter((l) => l.status === "design-stage").length,
});

export const formatSqft = (n: number) => n.toLocaleString("en-US");
