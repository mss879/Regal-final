// SEO pillar guides. Each one is a long-form, statically rendered page at /guides/<slug>.
// Rich text: write links as [label](/path) and bold as **text** (see components/guides/RichText).
// Keep facts to what the brochure states or what is publicly well established — no prices,
// distances or legal rules we can't stand behind. Legal points are general and hedged.
import { AMENITIES, SITE } from "./site";
import { lotCounts, render, type VillaSlug } from "./lots";

export type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; text: string }
  /** Table of the villas currently released, with links. */
  | { type: "villas" };

export type GuideSection = { id: string; heading: string; blocks: Block[] };

export type Guide = {
  slug: string;
  /** H1: the accent renders in the serif italic, like every other page title. */
  title: { lead: string; accent: string };
  /** <title>; the site name is appended by the template. */
  metaTitle: string;
  description: string;
  eyebrow: string;
  /** Short label for footers and link lists. */
  shortTitle: string;
  excerpt: string;
  hero: string;
  heroAlt: string;
  published: string;
  updated: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  relatedVillas: VillaSlug[];
  disclaimer?: string;
};

const c = lotCounts();
const PUBLISHED = "2026-10-04";

const amenityItems = AMENITIES.map((a) => `**${a.title}** — ${a.detail.charAt(0).toLowerCase()}${a.detail.slice(1)}.`);

export const GUIDES: Guide[] = [
  {
    slug: "luxury-villas-in-kandy",
    title: { lead: "Luxury villas", accent: "in Kandy" },
    metaTitle: "Luxury villas in Kandy: a buyer's guide",
    description:
      "What sets a luxury villa in Kandy apart — setting, architecture, privacy and amenities — and how to choose one, with the fully furnished lakefront villas at Regal Victoria Lakeside.",
    eyebrow: "Buyer's guide",
    shortTitle: "Luxury villas in Kandy",
    excerpt:
      "What makes a villa in the hills around Kandy genuinely special, what to look for before you buy, and the fully furnished lakefront villas now released at Regal Victoria Lakeside.",
    hero: render("lot-14-15", 8),
    heroAlt: "Lot 14 & 15 — a contemporary villa façade opening onto a landscaped garden",
    published: PUBLISHED,
    updated: PUBLISHED,
    sections: [
      {
        id: "why-kandy",
        heading: "Why Kandy",
        blocks: [
          {
            type: "p",
            text: "Kandy has always drawn people looking for something calmer than the coast. The last royal capital of Sri Lanka and a UNESCO World Heritage city, it sits in the central hills, where the air is fresher and the evenings cooler than in Colombo, and where forest, tea country and water are never far away.",
          },
          {
            type: "p",
            text: "For a second home, a family base or a place to come back to from overseas, the Kandy area offers a rare balance: a living city with schools, hospitals and culture on one side, and quiet hills and lakes on the other. East of the city, the Victoria District around Digana and Rajawella has become one of the most sought-after places to live — home to the Victoria Golf & Country Club, wellness retreats and wide views over the Victoria Reservoir. Our [Digana area guide](/guides/digana-victoria-area-guide) covers the neighbourhood in detail.",
          },
        ],
      },
      {
        id: "what-makes-luxury",
        heading: "What makes a villa genuinely luxurious",
        blocks: [
          {
            type: "p",
            text: "Floor areas and finishes are easy to compare on paper. What you notice after a year of living somewhere is different:",
          },
          {
            type: "list",
            items: [
              "**The setting.** A view that can't be built out, a breeze off the water and neighbours at a comfortable distance matter more than any finish.",
              "**Architecture that suits the climate.** Deep verandahs, cross-ventilation, planted roofs and glazing placed for the light keep a home comfortable without fighting the weather.",
              "**Privacy.** A gated, low-density enclave with landscaped boundaries gives you the calm of a country house without the isolation.",
              "**Shared amenities, properly run.** A pool, clubhouse, gym and security only add to daily life if someone looks after them — look for management built in from the start.",
              "**Ready to live in.** A fully furnished villa saves months of sourcing and fitting out, which matters most when you are buying from abroad.",
            ],
          },
        ],
      },
      {
        id: "the-collection",
        heading: "The villas at Regal Victoria Lakeside",
        blocks: [
          {
            type: "p",
            text: `[Regal Victoria Lakeside](/about) is a gated enclave of ${c.total} contemporary villas on an elevated site bordering the Victoria Reservoir in Digana. The villas are designed by teaM Architrave, the award-winning practice led by Madhura Prematilleke, and each one is delivered fully furnished with a landscaped garden.`,
          },
          { type: "p", text: `${c.released} villas are released now:` },
          { type: "villas" },
          {
            type: "p",
            text: `${c.sold} villas in the enclave have already found their owners and ${c.designStage} more are at design stage. You can see where every lot sits on the [interactive master plan](/#master-plan).`,
          },
        ],
      },
      {
        id: "amenities",
        heading: "Life inside the enclave",
        blocks: [
          { type: "p", text: "Residents share a set of amenities designed around the lake:" },
          { type: "list", items: amenityItems },
        ],
      },
      {
        id: "choosing",
        heading: "How to choose the right villa",
        blocks: [
          {
            type: "list",
            items: [
              "**Two bedrooms** — [Lot 10](/villas/lot-10) and [Lot 11](/villas/lot-11), each around 2,100 ft² including verandahs, suit couples and smaller families, or a lock-up-and-leave holiday home.",
              "**Three bedrooms** — [Lot 09](/villas/lot-09) sits directly above the lake edge, and [Lot 20](/villas/lot-20), nearing completion, is cantilevered out over the reservoir.",
              "**Four bedrooms** — the flagship [Lot 14 & 15](/villas/lot-14-15) combines two plots into 40 perches, with 3,800 ft² of living space and verandahs.",
            ],
          },
          {
            type: "p",
            text: "If you can, visit at different times of day: the light on the reservoir changes completely between morning and evening, and the best way to understand a site like this is to walk it.",
          },
        ],
      },
      {
        id: "pre-booking",
        heading: "How pre-booking works",
        blocks: [
          {
            type: "list",
            items: [
              "**Enquire.** Tell us which villas interest you through the [enquiry form](/contact) and we'll send plans, specifications and current pricing.",
              "**Visit the site.** We'll arrange a viewing in Digana — you can suggest a date when you enquire.",
              "**Agree the details.** The payment schedule, specification and handover are set out in a written agreement, which we recommend you review with your own lawyer.",
              "**Complete.** The transfer is handled by lawyers and a notary public, as with any property purchase in Sri Lanka.",
            ],
          },
          {
            type: "p",
            text: "Buying from overseas? Read our [guide to buying property in Sri Lanka](/guides/buying-property-in-sri-lanka).",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Are the villas sold furnished?",
        a: "Yes. Every villa at Regal Victoria Lakeside is delivered fully furnished, with a luxuriously landscaped garden.",
      },
      {
        q: "How many villas are there?",
        a: `The enclave has ${c.total} villa lots across two phases. ${c.sold} are sold, ${c.released} are released for pre-booking and ${c.designStage} are at design stage.`,
      },
      {
        q: "Where is Regal Victoria Lakeside?",
        a: `At ${SITE.address} — on an elevated site bordering the Victoria Reservoir, east of Kandy city.`,
      },
      {
        q: "Can I visit before deciding?",
        a: "Yes. Choose “Arranging a site visit” on the enquiry form and suggest a date; our team will confirm a time with you.",
      },
      {
        q: "Are prices published?",
        a: `Pricing is shared on request, together with current availability. Ask through the enquiry form or call ${SITE.phone}.`,
      },
    ],
    relatedVillas: ["lot-14-15", "lot-20", "lot-09"],
  },

  {
    slug: "victoria-reservoir-lakefront-property",
    title: { lead: "Lakefront living", accent: "on the Victoria Reservoir" },
    metaTitle: "Victoria Reservoir lakefront property near Kandy",
    description:
      "A guide to lakefront property on the Victoria Reservoir near Kandy — the landscape, what lakeside living is like, and what to check before buying a waterfront villa.",
    eyebrow: "Lakefront guide",
    shortTitle: "Lakefront property",
    excerpt:
      "The Victoria Reservoir is one of the most striking landscapes in the Kandy hills. Here's what living beside it is like, and what to check before you buy lakefront.",
    hero: render("lot-09", 7),
    heroAlt: "Aerial view of Lot 09 on its point above the Victoria Reservoir",
    published: PUBLISHED,
    updated: PUBLISHED,
    sections: [
      {
        id: "the-reservoir",
        heading: "The Victoria Reservoir",
        blocks: [
          {
            type: "p",
            text: "The Victoria Reservoir was created in the 1980s, when the Victoria Dam was built across the Mahaweli — Sri Lanka's longest river — as part of the Mahaweli development programme. Its job is hydro-power and irrigation, but over the decades the long, winding lake has also become one of the most beautiful landscapes in the Kandy hills.",
          },
          {
            type: "p",
            text: "Forested ridges run down to the water, much of the shoreline remains green, and the light moves from silver in the morning to gold at dusk. That combination of open water and unspoilt hills is exactly what makes a lakefront home here so rare.",
          },
        ],
      },
      {
        id: "why-lakefront",
        heading: "Why buyers look for lakefront",
        blocks: [
          {
            type: "list",
            items: [
              "**A view that stays a view.** Nobody builds on water, so an outlook across the reservoir is about as lasting as a view can be.",
              "**A calmer, cooler climate.** Breezes off the water and the elevation of the hills make evenings noticeably fresher than on the coast.",
              "**Something to do.** Boating, walks by the water and long lunches on the verandah become part of everyday life.",
              "**Scarcity.** Genuinely lakefront plots near Kandy are few and far between.",
            ],
          },
        ],
      },
      {
        id: "at-regal-victoria-lakeside",
        heading: "Lakefront at Regal Victoria Lakeside",
        blocks: [
          {
            type: "p",
            text: "Regal Victoria Lakeside occupies an elevated site bordering the reservoir in Digana. The master plan is laid out so that the villas, the 14.5 m infinity pool on the rocks and the open-air gym all look out across the water.",
          },
          {
            type: "p",
            text: "Every villa is positioned to maximise lake views and privacy. [Lot 09](/villas/lot-09) is the waterfront home of the collection — a 20-perch, three-bedroom villa set directly above the lake edge. [Lot 20](/villas/lot-20) is cantilevered out over the slope towards the reservoir, and the flagship [Lot 14 & 15](/villas/lot-14-15) has unobstructed water views from 40 perches of garden.",
          },
          {
            type: "p",
            text: "Residents can take a boat out on the lake, swim in the infinity pool with the reservoir beyond, or run the 400 m jogging track shaded by natural greenery. See all the [villas now released](/villas).",
          },
        ],
      },
      {
        id: "what-to-check",
        heading: "What to check before buying lakefront property",
        blocks: [
          { type: "p", text: "Waterfront land needs a little more homework than an ordinary plot. Whoever you buy from, ask about:" },
          {
            type: "list",
            items: [
              "**Elevation and slope.** A raised site gives better views and keeps the house well clear of seasonal changes in the water level.",
              "**Reservations and building lines.** Land beside reservoirs and rivers can be subject to reservation areas and building-line rules. Make sure the approved plans respect them.",
              "**Access and boundaries.** Confirm the access road, the boundaries on the survey plan and who maintains any shared areas by the water.",
              "**Approvals.** Ask to see the building approvals for the villa and the development, and have your lawyer check them.",
              "**Upkeep.** Gardens, slopes and shared facilities beside the water need regular care; find out who looks after them and how it is funded.",
            ],
          },
          {
            type: "p",
            text: "Our [guide to buying property in Sri Lanka](/guides/buying-property-in-sri-lanka) covers the legal process in more detail.",
          },
        ],
      },
      {
        id: "day-to-day",
        heading: "Day to day",
        blocks: [
          {
            type: "p",
            text: "Lakefront doesn't have to mean remote. Kandy city is a short drive from Digana, and the [Victoria District](/guides/digana-victoria-area-guide) around the reservoir is home to the Victoria Golf & Country Club, Pallekele International Cricket Stadium and some of the island's best-known wellness retreats.",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Is Regal Victoria Lakeside on the water?",
        a: "Yes. The enclave sits on an elevated site bordering the Victoria Reservoir, and every villa is positioned to make the most of the lake views.",
      },
      {
        q: "Which villa is closest to the water?",
        a: "Lot 09 is the waterfront villa of the collection, positioned directly above the lake edge.",
      },
      {
        q: "Can residents use the lake?",
        a: "Boating on the lake is one of the enclave's amenities, alongside the infinity pool, Victoria Clubhouse, padel court, jogging track and open-air gym.",
      },
      {
        q: "What is the Victoria Reservoir?",
        a: "A large reservoir on the Mahaweli River in the Kandy District, created by the Victoria Dam in the 1980s for hydro-power and irrigation.",
      },
    ],
    relatedVillas: ["lot-09", "lot-20", "lot-14-15"],
  },

  {
    slug: "buying-property-in-sri-lanka",
    title: { lead: "Buying property", accent: "in Sri Lanka" },
    metaTitle: "Buying property in Sri Lanka: a guide for overseas buyers",
    description:
      "How buying a villa in Sri Lanka works — for Sri Lankans at home and abroad and for foreign nationals — from due diligence and deeds to bringing in funds and pre-booking.",
    eyebrow: "Buying guide",
    shortTitle: "Buying in Sri Lanka",
    excerpt:
      "Who can buy, how the process works, bringing funds from overseas and what to check when you pre-book a villa — a plain-English overview to take to your lawyer.",
    hero: render("lot-20", 8),
    heroAlt: "Lot 20 — a cantilevered villa façade above the reservoir",
    published: PUBLISHED,
    updated: PUBLISHED,
    disclaimer:
      "This guide is general information only and is not legal, tax or financial advice. Property, exchange-control and tax rules in Sri Lanka change from time to time. Always take independent advice from a qualified Sri Lankan lawyer before you commit to a purchase.",
    sections: [
      {
        id: "who-can-buy",
        heading: "Who can buy",
        blocks: [
          { type: "p", text: "The rules depend on who is buying:" },
          {
            type: "list",
            items: [
              "**Sri Lankan citizens** — including Sri Lankans living overseas — can generally buy freehold land and houses in their own name.",
              "**Dual citizens** who hold Sri Lankan citizenship are generally treated as Sri Lankan citizens for property purposes. Keep your dual citizenship certificate to hand.",
              "**Foreign nationals** face restrictions on acquiring freehold land under the Land (Restrictions on Alienation) Act No. 38 of 2014. Long leases are the usual route for foreign buyers, and some exemptions exist, for example for certain apartments in condominium buildings. The right structure for you is a question for a Sri Lankan lawyer.",
              "**Companies** — the rules depend on who owns the company, so take specific legal advice.",
            ],
          },
        ],
      },
      {
        id: "the-process",
        heading: "The buying process, step by step",
        blocks: [
          { type: "p", text: "A typical purchase follows these steps. Your lawyer will guide you through each one." },
          {
            type: "list",
            items: [
              "**Agree terms.** Agree the price, what is included and the payment schedule in writing.",
              "**Due diligence.** Your lawyer searches the land registry records to confirm the seller's title, and checks the survey plan, boundaries, access and any encumbrances such as mortgages.",
              "**Check approvals.** For a new villa, ask for the approved building plans and local authority approvals and, on completion, the certificate of conformity.",
              "**Sign the agreement.** For a villa that is off-plan or under construction this is usually an agreement to sell, with payments linked to the build programme.",
              "**Execute and register.** The deed of transfer (or lease) is signed before a notary public and registered at the land registry.",
              "**Pay duties and fees.** Budget for stamp duty, notary and legal fees and registration charges on top of the purchase price.",
            ],
          },
        ],
      },
      {
        id: "funds-from-overseas",
        heading: "Bringing funds from overseas",
        blocks: [
          {
            type: "p",
            text: "If you are paying from abroad, plan how the money will move before you commit. Under the Foreign Exchange Act No. 12 of 2017, investment funds brought into Sri Lanka are generally routed through an Inward Investment Account (IIA) opened with a licensed bank, which keeps a clear record of the investment.",
          },
          {
            type: "p",
            text: "Your bank and lawyer can confirm the current requirements for your situation, including whether and how funds can later be taken back out of the country.",
          },
        ],
      },
      {
        id: "pre-booking",
        heading: "Buying off-plan or pre-booking",
        blocks: [
          {
            type: "p",
            text: "Several villas at Regal Victoria Lakeside are offered for pre-booking ahead of completion, which lets you choose your plot early. Read the paperwork carefully and check:",
          },
          {
            type: "list",
            items: [
              "the payment schedule, and what each payment is linked to;",
              "the specification, furnishing and landscaping included;",
              "the expected completion timeline, and what happens if it changes;",
              "how shared facilities and management will be run and paid for after handover.",
            ],
          },
          {
            type: "p",
            text: "We're happy to share plans, specifications and the documents your lawyer needs — just ask through the [enquiry form](/contact).",
          },
        ],
      },
      {
        id: "buying-from-abroad",
        heading: "Viewing and buying from abroad",
        blocks: [
          {
            type: "p",
            text: "If you live overseas, we can send detailed plans, renders and the full [brochure](/brochure), talk you through the [villas](/villas) by phone or email, and arrange a [site visit](/contact) for your next trip to Sri Lanka.",
          },
          {
            type: "p",
            text: "Many steps of a purchase can be handled by your lawyer while you are away, and documents can often be signed under a power of attorney. Ask your lawyer what applies to you.",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Can foreigners buy a villa in Sri Lanka?",
        a: "Foreign nationals face restrictions on buying freehold land, but long leases and some other structures are possible. The right route depends on your circumstances, so speak to a Sri Lankan lawyer before you commit.",
      },
      {
        q: "Can Sri Lankans living abroad buy property?",
        a: "Yes. Sri Lankan citizens, including those living overseas and dual citizens, can generally buy property in their own name.",
      },
      {
        q: "What costs are there on top of the price?",
        a: "Budget for stamp duty, notary and legal fees, and registration charges. Your lawyer can give you current figures.",
      },
      {
        q: "Do I need to be in Sri Lanka to buy?",
        a: "Not necessarily. Many steps can be handled by your lawyer, and documents can often be signed under a power of attorney. Ask your lawyer what applies to you.",
      },
      {
        q: "Is this guide legal advice?",
        a: "No. It is general information only. Always take independent advice from a qualified Sri Lankan lawyer.",
      },
    ],
    relatedVillas: ["lot-10", "lot-11", "lot-14-15"],
  },

  {
    slug: "digana-victoria-area-guide",
    title: { lead: "Digana &", accent: "the Victoria District" },
    metaTitle: "Digana & the Victoria District, Kandy: an area guide",
    description:
      "Living in Digana and Rajawella near Kandy — the Victoria Reservoir, golf, cricket, wellness, Kandy city, getting there and everyday life around Regal Victoria Lakeside.",
    eyebrow: "Area guide",
    shortTitle: "Digana area guide",
    excerpt:
      "Golf by the water, cricket at Pallekele, wellness retreats in the hills and the cultural heart of Kandy close by — a guide to the neighbourhood around Regal Victoria Lakeside.",
    hero: render("lot-14-15", 24),
    heroAlt: "Looking across the Victoria Reservoir from a villa garden, with the hills beyond",
    published: PUBLISHED,
    updated: PUBLISHED,
    sections: [
      {
        id: "where-is-digana",
        heading: "Where is Digana?",
        blocks: [
          {
            type: "p",
            text: "Digana is a town in the Kandy District, east of Kandy city, on the edge of the Victoria Reservoir. Together with neighbouring Rajawella it forms the heart of Kandy's Victoria District: green hills, the long reach of the reservoir and a scattering of golf, wellness and leisure retreats.",
          },
          {
            type: "p",
            text: `[Regal Victoria Lakeside](/about) sits at ${SITE.address}, on an elevated site bordering the water.`,
          },
        ],
      },
      {
        id: "golf-cricket-wellness",
        heading: "Golf, cricket and wellness",
        blocks: [
          {
            type: "list",
            items: [
              "**Victoria Golf & Country Club** — an 18-hole course laid out along the reservoir, widely regarded as one of the most scenic in the region.",
              "**Pallekele International Cricket Stadium** — one of Sri Lanka's international venues, hosting Test, one-day and T20 matches.",
              "**Santani Wellness Resort & Spa** — a well-known wellness retreat in the hills nearby.",
              "**Earl's Regency and Jetwing Kandy Gallery** — two of the area's established hotels, handy when friends and family come to visit.",
            ],
          },
        ],
      },
      {
        id: "kandy-city",
        heading: "Kandy city",
        blocks: [
          {
            type: "p",
            text: "Kandy, the last royal capital of Sri Lanka, is a UNESCO World Heritage city and the cultural heart of the island. The Temple of the Sacred Tooth Relic beside Kandy Lake draws visitors from all over the world, especially during the Esala Perahera procession each July or August, and the Royal Botanic Gardens at Peradeniya are just outside the city.",
          },
          {
            type: "p",
            text: "For everyday needs, Kandy has hospitals, schools, banks, supermarkets and restaurants, while Digana town covers the essentials closer to home.",
          },
        ],
      },
      {
        id: "hills-and-water",
        heading: "Hills, water and nature",
        blocks: [
          {
            type: "p",
            text: "The landscape is why most people fall for this part of Sri Lanka. The reservoir winds between forested ridges, and to the north rise the Knuckles mountains — part of the Central Highlands UNESCO World Heritage site and a favourite for hiking.",
          },
          {
            type: "p",
            text: "Closer to home, residents of Regal Victoria Lakeside can walk the shaded 400 m jogging track, swim in the infinity pool on the rocks or take a boat out on the lake. Read more in our [lakefront living guide](/guides/victoria-reservoir-lakefront-property).",
          },
        ],
      },
      {
        id: "getting-here",
        heading: "Getting here",
        blocks: [
          {
            type: "list",
            items: [
              "**From Colombo** — by road along the Colombo–Kandy route, with expressway sections shortening the journey. Travel times vary with traffic and the route you take.",
              "**From Bandaranaike International Airport (Katunayake)** — by road, without needing to pass through central Colombo.",
              "**From Kandy city** — a short drive east towards Digana.",
            ],
          },
          {
            type: "p",
            text: "Planning a visit? [Request a site viewing](/contact) and our team will send directions.",
          },
        ],
      },
      {
        id: "climate",
        heading: "Climate",
        blocks: [
          {
            type: "p",
            text: "The Kandy hills are warm all year but milder than the coast, with cooler evenings. Rain arrives in several seasons, keeping the countryside green, while the drier spells in between are perfect for being out on the water.",
          },
        ],
      },
    ],
    faqs: [
      {
        q: "Where is Digana?",
        a: "Digana is a town in the Kandy District, a short drive east of Kandy city, on the edge of the Victoria Reservoir.",
      },
      {
        q: "Is there golf near Regal Victoria Lakeside?",
        a: "Yes. The Victoria Golf & Country Club, an 18-hole course along the reservoir, is in the same Victoria District.",
      },
      {
        q: "What is there to do nearby?",
        a: "Golf, international cricket at Pallekele, wellness retreats, hiking in the Knuckles range, boating on the lake and the cultural sights of Kandy city.",
      },
      {
        q: "What is the address of Regal Victoria Lakeside?",
        a: `${SITE.address}, Kandy District, Sri Lanka.`,
      },
    ],
    relatedVillas: ["lot-14-15", "lot-10", "lot-11"],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** Rough reading time from the guide's text (220 words a minute). */
export function readingMinutes(g: Guide): number {
  const text = g.sections
    .flatMap((s) => s.blocks.flatMap((b) => (b.type === "list" ? b.items : "text" in b ? [b.text] : [])))
    .concat(g.faqs.flatMap((f) => [f.q, f.a]))
    .join(" ");
  return Math.max(3, Math.round(text.split(/\s+/).length / 220));
}
