// schema.org builders for JSON-LD. Entities reference each other by @id, so the site-wide
// graph (organisation, website, the residence) is emitted once in the (site) layout and pages
// add their own nodes. Never include data we can't stand behind (no prices, no coordinates).
import { AMENITIES, COPY, SITE, SOCIAL, TEAM } from "./site";
import { STATUS_LABEL, type Lot } from "./lots";
import { IMAGES } from "./images";
import type { Guide } from "./guides";
import { absoluteUrl } from "./seo";

type Node = Record<string, unknown>;

export const ORG_ID = absoluteUrl("/#organization");
export const WEBSITE_ID = absoluteUrl("/#website");
export const RESIDENCE_ID = absoluteUrl("/#residence");

const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "7/1/D Kosambewatta, Rajawella",
  addressLocality: "Digana",
  addressRegion: "Central Province",
  addressCountry: "LK",
};

const TELEPHONE = "+94 77 373 8943";

/** Only real profiles: placeholder URLs in SOCIAL are left out until they're replaced. */
const sameAs = () => SOCIAL.filter((s) => !s.placeholder).map((s) => s.href);

export function siteGraph(): Node[] {
  const social = sameAs();
  return [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE.name,
      alternateName: SITE.short,
      url: SITE.url,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png"), width: 512, height: 512 },
      image: absoluteUrl(IMAGES.hero),
      description: SITE.description,
      email: SITE.email,
      telephone: TELEPHONE,
      address: ADDRESS,
      parentOrganization: { "@type": "Organization", name: TEAM.developer.name },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: TELEPHONE,
        email: SITE.email,
        availableLanguage: ["English"],
      },
      ...(social.length ? { sameAs: social } : {}),
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "en",
      publisher: { "@id": ORG_ID },
    },
    {
      "@type": "GatedResidenceCommunity",
      "@id": RESIDENCE_ID,
      name: SITE.name,
      description: `${COPY.collection} ${COPY.neighbourhood}`,
      url: SITE.url,
      telephone: TELEPHONE,
      address: ADDRESS,
      image: [absoluteUrl(IMAGES.hero), absoluteUrl(IMAGES.amenities.feature), absoluteUrl(IMAGES.about.hero)],
      amenityFeature: AMENITIES.map((a) => ({ "@type": "LocationFeatureSpecification", name: a.title, value: true })),
      containedInPlace: { "@type": "Place", name: "Digana, Kandy, Sri Lanka" },
    },
  ];
}

export function breadcrumbs(items: { name: string; path: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function villaGraph(villa: Lot): Node[] {
  const url = absoluteUrl(`/villas/${villa.slug}`);
  return [
    {
      "@type": "SingleFamilyResidence",
      "@id": `${url}#residence`,
      name: `${villa.label}, ${SITE.name}`,
      description: villa.description,
      url,
      image: absoluteUrl(villa.hero!),
      numberOfBedrooms: villa.bedrooms,
      numberOfRooms: villa.bedrooms,
      floorSize: { "@type": "QuantitativeValue", value: villa.areas?.total, unitCode: "FTK", unitText: "ft²" },
      address: ADDRESS,
      containedInPlace: { "@id": RESIDENCE_ID },
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Fully furnished", value: true },
        { "@type": "LocationFeatureSpecification", name: "Landscaped garden", value: true },
        { "@type": "LocationFeatureSpecification", name: "Lake views", value: true },
      ],
    },
    {
      "@type": "RealEstateListing",
      "@id": `${url}#listing`,
      url,
      name: `${villa.label} — ${villa.bedrooms} bedroom lakefront villa`,
      description: `${villa.description} Status: ${STATUS_LABEL[villa.status]}.`,
      image: absoluteUrl(villa.hero!),
      about: { "@id": `${url}#residence` },
      provider: { "@id": ORG_ID },
      isPartOf: { "@id": WEBSITE_ID },
    },
  ];
}

export function guideGraph(guide: Guide): Node[] {
  const url = absoluteUrl(`/guides/${guide.slug}`);
  return [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: `${guide.title.lead} ${guide.title.accent}`,
      description: guide.description,
      url,
      mainEntityOfPage: url,
      image: absoluteUrl(guide.hero),
      datePublished: guide.published,
      dateModified: guide.updated,
      inLanguage: "en",
      author: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": RESIDENCE_ID },
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      mainEntity: guide.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
}
