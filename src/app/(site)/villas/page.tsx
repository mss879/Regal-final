import { LOTS, STATUS_LABEL, villasInOrder, lotCounts } from "@/lib/lots";
import { COPY } from "@/lib/site";
import { PageHero } from "@/components/layout/PageHero";
import { VillaCard } from "@/components/villas/VillaCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/home/CtaBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/schema";

export const metadata = pageMetadata({
  title: "Luxury villas for sale — the collection",
  description:
    "Five fully furnished contemporary villas released for pre-booking at Regal Victoria Lakeside, Digana: two to four bedrooms on 20–40 perch lots above the Victoria Reservoir.",
  path: "/villas",
});

export default function VillasPage() {
  const villas = villasInOrder();
  const c = lotCounts();
  const unavailable = LOTS.filter((l) => !l.slug);

  return (
    <main>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Villas", path: "/villas" }])} />
      <PageHero
        eyebrow="Villa collection · Current offerings"
        title={
          <>
            The villa
            <br />
            <em>collection</em>
          </>
        }
        body={
          <p>
            {COPY.release} {COPY.releaseDetail}
          </p>
        }
        image="/images/lots/lot-20/hero.jpg"
        imageAlt="Lot 20 — a cantilevered contemporary villa above the Victoria Reservoir"
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/#master-plan" variant="light">Explore the master plan</ButtonLink>
          <ButtonLink href="/contact" variant="outline-light" arrow={false}>Enquire</ButtonLink>
        </div>
      </PageHero>

      <section className="container-x py-24 md:py-32" aria-labelledby="released-title">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel index="01">Released now</SectionLabel>
            <h2 id="released-title" className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
              {c.released} villas <span className="text-leaf">available</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.9rem] text-ink-2 md:text-right">
            Each villa opens its full catalogue — plans, elevations and every artist&apos;s impression.
          </p>
        </div>
        <Reveal mode="children" className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {villas.map((v, i) => (
            <div key={v.slug} data-reveal className={i === 0 ? "lg:col-span-2" : ""}>
              <VillaCard villa={v} index={i} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
            </div>
          ))}
        </Reveal>
      </section>

      <section className="container-x pb-24 md:pb-32" aria-labelledby="all-lots-title">
        <SectionLabel index="02">All lots</SectionLabel>
        <h2 id="all-lots-title" className="mt-6 mb-10 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
          The other {unavailable.length} lots
        </h2>
        <Reveal mode="children" as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" stagger={0.04}>
          {unavailable.map((l) => (
            <li
              key={l.id}
              data-reveal
              className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
                l.status === "sold" ? "border-sold/25 bg-sold/5" : "border-design/30 bg-design/5"
              }`}
            >
              <span className="font-display text-lg text-forest">{l.label}</span>
              <span className={`text-[0.66rem] font-semibold tracking-[0.16em] uppercase ${l.status === "sold" ? "text-sold" : "text-design"}`}>
                {STATUS_LABEL[l.status]} · P0{l.phase}
              </span>
            </li>
          ))}
        </Reveal>
      </section>

      <CtaBand />
    </main>
  );
}
