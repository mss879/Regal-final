import { GUIDES } from "@/lib/guides";
import { IMAGES } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/schema";
import { PageHero } from "@/components/layout/PageHero";
import { GuideCard } from "@/components/guides/GuideCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/home/CtaBand";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = pageMetadata({
  title: "Guides to lakeside living in Kandy",
  description:
    "Guides to luxury villas in Kandy, lakefront living on the Victoria Reservoir, the Digana area and buying property in Sri Lanka — from the team at Regal Victoria Lakeside.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <main>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }])} />
      <PageHero
        eyebrow="Guides"
        title={
          <>
            Guides to
            <br />
            <em>lakeside living</em>
          </>
        }
        body={
          <p>
            Everything you need to know about luxury villas in Kandy, lakefront living on the Victoria Reservoir, the
            neighbourhood around Digana and buying property in Sri Lanka.
          </p>
        }
        image={IMAGES.about.setting}
        imageAlt="Looking across the Victoria Reservoir from a villa garden, with the hills beyond"
      >
        <ButtonLink href="/villas" variant="light">See the villas</ButtonLink>
      </PageHero>

      <section className="container-x py-24 md:py-32" aria-labelledby="guides-title">
        <SectionLabel index="01">All guides</SectionLabel>
        <h2 id="guides-title" className="mt-6 mb-12 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
          Read before <span className="text-leaf">you visit</span>
        </h2>
        <Reveal mode="children" className="grid gap-x-8 gap-y-14 md:grid-cols-2">
          {GUIDES.map((g, i) => (
            <div key={g.slug} data-reveal>
              <GuideCard guide={g} index={i} sizes="(min-width: 768px) 50vw, 100vw" />
            </div>
          ))}
        </Reveal>
      </section>

      <CtaBand />
    </main>
  );
}
