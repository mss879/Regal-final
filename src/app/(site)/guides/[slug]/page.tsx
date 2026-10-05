import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide, readingMinutes, type Block } from "@/lib/guides";
import { getVilla } from "@/lib/lots";
import { formatDate } from "@/lib/time";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, guideGraph } from "@/lib/schema";
import { PageHero } from "@/components/layout/PageHero";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/home/CtaBand";
import { VillaCard } from "@/components/villas/VillaCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { RichText } from "@/components/guides/RichText";
import { VillaTable } from "@/components/guides/VillaTable";
import { Faq } from "@/components/guides/Faq";
import { GuideCard } from "@/components/guides/GuideCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return pageMetadata({
    title: guide.metaTitle,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    type: "article",
    publishedTime: guide.published,
    modifiedTime: guide.updated,
  });
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    case "list":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <p className="rounded-[22px] bg-cream p-6">
          <RichText text={block.text} />
        </p>
      );
    case "villas":
      return <VillaTable />;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const path = `/guides/${guide.slug}`;
  const villas = guide.relatedVillas.map((s) => getVilla(s)!);
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <main>
      <JsonLd
        data={[
          ...guideGraph(guide),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: guide.shortTitle, path },
          ]),
        ]}
      />
      <PageHero
        eyebrow={
          <span className="flex items-center gap-2">
            <Link href="/guides" className="hover:text-paper">Guides</Link>
            <span aria-hidden>/</span>
            <span>{guide.eyebrow}</span>
          </span>
        }
        title={
          <>
            {guide.title.lead}
            <br />
            <em>{guide.title.accent}</em>
          </>
        }
        body={<p>{guide.excerpt}</p>}
        image={guide.hero}
        imageAlt={guide.heroAlt}
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/villas" variant="light">See the villas</ButtonLink>
          <ButtonLink href="/contact" variant="outline-light" arrow={false}>Book a site visit</ButtonLink>
        </div>
      </PageHero>

      <article className="container-x py-24 md:py-32" aria-label={`${guide.title.lead} ${guide.title.accent}`}>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:col-span-4">
            <nav aria-label="In this guide" className="lg:sticky lg:top-28">
              <SectionLabel>In this guide</SectionLabel>
              <ol className="mt-6 space-y-3">
                {guide.sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="flex gap-4 text-[0.95rem] text-ink-2 transition-colors hover:text-forest">
                      <span className="font-display text-leaf">{pad(i + 1)}</span>
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
              <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-forest/15 pt-6">
                <div>
                  <dt className="text-[0.62rem] tracking-[0.16em] text-ink-2 uppercase">Updated</dt>
                  <dd className="mt-1 font-display text-lg text-forest">
                    <time dateTime={guide.updated}>{formatDate(guide.updated)}</time>
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.62rem] tracking-[0.16em] text-ink-2 uppercase">Reading time</dt>
                  <dd className="mt-1 font-display text-lg text-forest">{readingMinutes(guide)} minutes</dd>
                </div>
              </dl>
            </nav>
          </aside>

          {/* min-w-0: the villa table scrolls inside its own box instead of widening the page on phones */}
          <div className="min-w-0 lg:col-span-8">
            {guide.sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                aria-labelledby={`${s.id}-title`}
                className="scroll-mt-28 border-t border-forest/10 pt-10 first:border-0 first:pt-0 [&+&]:mt-14"
              >
                <SectionLabel index={pad(i + 1)}>of {pad(guide.sections.length)}</SectionLabel>
                <h2
                  id={`${s.id}-title`}
                  className="mt-5 font-display text-[clamp(1.7rem,2.8vw,2.6rem)] leading-[1.05] font-normal tracking-[-0.02em] text-forest uppercase"
                >
                  {s.heading}
                </h2>
                <div className="rvl-prose mt-6">
                  {s.blocks.map((b, j) => (
                    <BlockView key={j} block={b} />
                  ))}
                </div>
              </section>
            ))}
            {guide.disclaimer && (
              <p className="mt-14 rounded-[22px] border border-design/30 bg-design/5 p-6 text-[0.85rem] leading-relaxed text-ink-2">
                <strong className="font-semibold text-forest">Please note: </strong>
                {guide.disclaimer}
              </p>
            )}
          </div>
        </div>
      </article>

      <section className="container-x pb-24 md:pb-32" aria-labelledby="related-title">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <SectionLabel index="—">The villas</SectionLabel>
            <h2 id="related-title" className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
              Villas <span className="text-leaf">released now</span>
            </h2>
          </div>
          <ButtonLink href="/villas" variant="outline">All villas</ButtonLink>
        </div>
        <Reveal mode="children" className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {villas.map((v) => (
            <div key={v.slug} data-reveal>
              <VillaCard villa={v} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
            </div>
          ))}
        </Reveal>
      </section>

      <section className="mb-3 bg-cream py-24 md:mb-4 md:py-32" aria-labelledby="faq-title">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionLabel index="?">FAQ</SectionLabel>
            <h2 id="faq-title" className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
              Questions, <span className="text-leaf">answered</span>
            </h2>
          </div>
          <div className="lg:col-span-8">
            <Faq items={guide.faqs} />
          </div>
        </div>
      </section>

      <section className="container-x py-24 md:py-32" aria-labelledby="more-guides-title">
        <SectionLabel>Keep reading</SectionLabel>
        <h2 id="more-guides-title" className="mt-6 mb-12 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
          More <span className="text-leaf">guides</span>
        </h2>
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-3">
          {others.map((g) => (
            <GuideCard key={g.slug} guide={g} sizes="(min-width: 768px) 33vw, 100vw" />
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
