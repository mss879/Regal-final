import Image from "next/image";
import { AMENITIES, COPY } from "@/lib/site";
import { poolSlides } from "@/lib/assets";
import { IMAGES } from "@/lib/images";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Marquee } from "@/components/ui/Marquee";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";
import { MotionImage } from "@/components/motion/MotionImage";
import { LightboxButton } from "@/components/villas/Gallery";

// The activity photos only exist at ~420-460 px, so they are shown as small cards.
const ACTIVITIES = [
  { src: IMAGES.small.jogging, title: "400 m jogging track", note: "Along the water" },
  { src: IMAGES.small.padel, title: "Padel court", note: "Social play" },
  { src: IMAGES.small.gym, title: "Open-air gym", note: "Over the reservoir" },
];

export function Amenities() {
  const pool = poolSlides().map((s, i) => ({ ...s, alt: i === 0 ? "Infinity pool layout" : `Infinity pool on the rocks — artist's impression ${i}` }));
  return (
    <section className="pb-28 md:pb-40" aria-labelledby="amenities-title">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionLabel index="02">Common amenities & features</SectionLabel>
            <SplitHeading
              id="amenities-title"
              by="words"
              className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase [&_em]:text-leaf [&_em]:not-italic"
            >
              A community designed for <em>wellness, leisure</em> and everyday comfort
            </SplitHeading>
            <Reveal as="p" className="mt-6 max-w-md font-serif text-2xl leading-snug text-ink-2 italic">
              {COPY.community}
            </Reveal>

            <Reveal as="ol" mode="children" className="mt-10 divide-y divide-forest/10 border-y border-forest/10" stagger={0.06}>
              {AMENITIES.map((a, i) => (
                <li key={a.title} data-reveal className="group flex items-baseline gap-5 py-4">
                  <span className="w-6 font-display text-xs text-leaf">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">
                    <span className="block font-display text-lg text-forest transition-transform duration-500 group-hover:translate-x-1.5">{a.title}</span>
                    <span className="mt-0.5 block text-[0.82rem] leading-snug text-ink-2">{a.detail}</span>
                  </span>
                </li>
              ))}
            </Reveal>
          </div>
        </div>

        <div className="lg:col-span-7">
          <MotionImage
            src={IMAGES.amenities.feature}
            alt="Infinity pool deck with loungers overlooking the reservoir"
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="aspect-[16/10] rounded-[26px]"
            parallax={4}
            quality={90}
          >
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 md:inset-x-6 md:bottom-6">
              <div className="rounded-2xl bg-paper/90 p-4 backdrop-blur md:p-5">
                <p className="eyebrow text-leaf">Signature</p>
                <p className="mt-1 max-w-[16rem] font-display text-xl leading-tight text-forest md:text-2xl">Infinity swimming pool on the rocks</p>
                <p className="mt-1 max-w-[16rem] text-[0.78rem] text-ink-2">A 14.5 m infinity pool set among the rocks, with deck, pool bar and shower.</p>
              </div>
              <LightboxButton
                slides={pool}
                label="Open the pool gallery"
                start={1}
                className="flex shrink-0 items-center gap-2 rounded-full bg-forest px-5 py-3 text-[0.8rem] font-semibold text-paper transition-colors hover:bg-leaf"
              >
                <span className="relative size-5 overflow-hidden rounded-full">
                  <Image src={pool[1]?.src ?? pool[0].src} alt="" fill sizes="20px" className="object-cover" />
                </span>
                {pool.length} images
              </LightboxButton>
            </div>
          </MotionImage>

          <div className="mt-4 grid grid-cols-2 gap-4 md:mt-6 md:gap-6">
            {IMAGES.amenities.grid.map((g, i) => (
              <MotionImage
                key={g.src}
                src={g.src}
                alt={g.alt}
                sizes="(min-width: 1024px) 28vw, 50vw"
                className={`aspect-[4/3.4] rounded-[22px] ${i % 2 ? "md:mt-10" : ""}`}
                parallax={4}
                delay={i % 2 ? 0.12 : 0}
              />
            ))}
          </div>

          <Reveal mode="children" as="ul" className="mt-10 grid grid-cols-3 gap-3 md:mt-14 md:gap-5" stagger={0.08}>
            {ACTIVITIES.map((a) => (
              <li key={a.title} data-reveal className="max-w-[260px]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream-2">
                  <Image src={a.src} alt={a.title} fill sizes="(min-width: 1024px) 260px, 30vw" className="object-cover" />
                </div>
                <p className="mt-3 font-display text-[0.95rem] leading-tight text-forest md:text-base">{a.title}</p>
                <p className="text-[0.75rem] text-ink-2">{a.note}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </div>

      <Marquee
        items={AMENITIES.map((a) => a.title)}
        className="mt-28 border-y border-forest/10 py-8 font-display text-[clamp(2.2rem,5vw,4.5rem)] font-light text-forest uppercase md:mt-40"
        duration={45}
      />
    </section>
  );
}
