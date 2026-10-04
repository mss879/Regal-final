import Image from "next/image";
import { COPY, SITE, TEAM, AMENITIES } from "@/lib/site";
import { lotCounts } from "@/lib/lots";
import { PageHero } from "@/components/layout/PageHero";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Marquee } from "@/components/ui/Marquee";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";
import { Counter } from "@/components/motion/Counter";
import { MotionImage } from "@/components/motion/MotionImage";
import { CtaBand } from "@/components/home/CtaBand";
import { IMAGES } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/schema";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = pageMetadata({
  title: "About the lakefront villa enclave",
  description:
    "A gated enclave of 15 contemporary villas by E.M.S Leisure Holdings and teaM Architrave, on an elevated site bordering the Victoria Reservoir in Digana, Kandy.",
  path: "/about",
});

const CHAPTERS = [
  {
    index: "01",
    label: "The setting",
    title: (
      <>
        A private lakefront in <em>Kandy&apos;s Victoria District</em>
      </>
    ),
    body: [COPY.collection, COPY.neighbourhood],
    image: IMAGES.about.setting,
    alt: "Looking across the Victoria Reservoir from a villa garden, with the hills beyond",
    ratio: "aspect-[13/10]",
  },
  {
    index: "02",
    label: "The architecture",
    title: (
      <>
        Contemporary elegance, <em>the tranquillity of nature</em>
      </>
    ),
    body: [COPY.harmony, COPY.terraces],
    image: IMAGES.about.architecture,
    alt: "A shaded verandah and terraced garden looking across the reservoir",
    ratio: "aspect-[13/10]",
  },
  {
    index: "03",
    label: "The interiors",
    title: (
      <>
        Understated luxury, <em>abundant light</em>
      </>
    ),
    body: [COPY.glazing, COPY.light],
    image: IMAGES.about.interiors,
    alt: "An open-plan living and dining room with floor-to-ceiling glazing onto the lake",
    ratio: "aspect-[13/10]",
  },
];

export default function AboutPage() {
  const c = lotCounts();
  return (
    <main>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />
      <PageHero
        eyebrow="About Regal Victoria Lakeside"
        title={
          <>
            Where luxury
            <br />
            meets <em>serenity</em>
          </>
        }
        body={<p>{COPY.intro}</p>}
        image={IMAGES.about.hero}
        imageAlt="Aerial view of a villa's planted roofs and gardens, with the Victoria Reservoir and hills beyond"
      >
        <ButtonLink href="/#master-plan" variant="light">See the master plan</ButtonLink>
      </PageHero>

      {/* Numbers */}
      <section className="container-x py-24 md:py-32" aria-label="At a glance">
        <Reveal mode="children" className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {[
            { n: c.total, pad: 2, label: "Personalised villas" },
            { n: 2, pad: 2, label: "Release phases" },
            { n: 400, suffix: "m", label: "Shaded jogging track" },
            { n: 24, suffix: "h", label: "Security" },
          ].map((s) => (
            <div key={s.label} data-reveal className="border-t border-forest/15 pt-6">
              <p className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-none font-light text-forest">
                <Counter value={s.n} pad={s.pad} suffix={s.suffix} />
              </p>
              <p className="mt-3 text-[0.85rem] text-ink-2">{s.label}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Chapters */}
      {CHAPTERS.map((ch, i) => (
        <section key={ch.index} className="container-x pb-24 md:pb-36" aria-labelledby={`chapter-${ch.index}`}>
          <div className={`grid items-center gap-12 lg:grid-cols-12 lg:gap-16 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <MotionImage
              src={ch.image}
              alt={ch.alt}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className={`rounded-[28px] lg:col-span-7 ${ch.ratio}`}
              reveal={i % 2 ? "right" : "left"}
              parallax={4}
              quality={90}
            />
            <div className="lg:col-span-5">
              <SectionLabel index={ch.index}>{ch.label}</SectionLabel>
              <SplitHeading
                id={`chapter-${ch.index}`}
                by="words"
                className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase [&_em]:text-leaf [&_em]:not-italic"
              >
                {ch.title}
              </SplitHeading>
              <Reveal className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-ink-2">
                {ch.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </Reveal>
            </div>
          </div>
        </section>
      ))}

      {/* Master plan teaser */}
      <section className="px-3 md:px-4" aria-labelledby="about-plan-title">
        <div className="grain relative overflow-hidden rounded-[36px] bg-forest px-5 py-20 text-paper md:px-10 md:py-28">
          <div className="container-x grid gap-12 px-0 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <SectionLabel index="04" tone="light">The master plan</SectionLabel>
              <SplitHeading
                id="about-plan-title"
                by="words"
                className="mt-6 font-display text-title font-light tracking-[-0.02em] uppercase [&_em]:text-lime [&_em]:not-italic"
              >
                Fifteen villas, <em>two phases</em>
              </SplitHeading>
              <Reveal className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-sage-2">
                <p>
                  Phase 01 surrounds the infinity pool along the southern shore; Phase 02 occupies the northern and
                  western lots beside the Victoria Clubhouse. {c.sold} villas have already found their owners and {c.released} are released for
                  pre-booking now.
                </p>
              </Reveal>
              <Reveal className="mt-8">
                <ButtonLink href="/#master-plan" variant="light">Explore interactively</ButtonLink>
              </Reveal>
            </div>
            <MotionImage
              src="/images/map/site-plan.png"
              alt="The Regal Victoria Lakeside site plan"
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="aspect-[3/2] rounded-[24px] lg:col-span-7"
              imgClassName="object-contain"
              parallax={0}
              reveal="up"
              quality={90}
            />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="container-x py-24 md:py-36" aria-labelledby="team-title">
        <div className="mb-14 grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel index="05">The team</SectionLabel>
            <h2 id="team-title" className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
              The people behind <span className="text-leaf">the lakefront</span>
            </h2>
          </div>
        </div>
        <Reveal mode="children" className="grid gap-6 md:grid-cols-2">
          <article data-reveal className="flex flex-col justify-between gap-12 rounded-[28px] bg-cream p-8 md:p-10">
            <div>
              <p className="eyebrow text-leaf">{TEAM.developer.role}</p>
              <h3 className="mt-3 font-display text-3xl text-forest">{TEAM.developer.name}</h3>
              <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-ink-2">{TEAM.developer.body}</p>
            </div>
            <Logo className="w-48 text-forest" />
          </article>
          <article data-reveal className="flex flex-col justify-between gap-12 rounded-[28px] bg-forest p-8 text-paper md:p-10">
            <div>
              <p className="eyebrow text-lime">{TEAM.architect.role}</p>
              <h3 className="mt-3 font-display text-3xl">{TEAM.architect.name}</h3>
              <p className="mt-1 text-[0.8rem] text-sage">{TEAM.architect.place}</p>
              <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-sage-2">{TEAM.architect.body}</p>
            </div>
            <ButtonLink href={TEAM.architect.url} variant="outline-light" external className="self-start">
              {TEAM.architect.urlLabel}
            </ButtonLink>
          </article>
        </Reveal>
      </section>

      {/* Amenities strip */}
      <section className="pb-24 md:pb-32" aria-label="Amenities">
        <div className="container-x mb-10 grid gap-6 md:grid-cols-3">
          {IMAGES.about.strip.map((src, i) => (
            <Reveal key={src} delay={i * 0.1} className="relative aspect-[4/3] overflow-hidden rounded-[22px]">
              <Image src={src} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
            </Reveal>
          ))}
        </div>
        <Marquee
          items={AMENITIES.map((a) => a.title)}
          className="border-y border-forest/10 py-6 font-display text-[clamp(1.8rem,4vw,3.5rem)] font-light text-forest uppercase"
        />
      </section>

      <CtaBand body={`${SITE.name} — ${SITE.location}. ${SITE.address}.`} />
    </main>
  );
}
