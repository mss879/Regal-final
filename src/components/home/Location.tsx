import { COPY, LANDMARKS, SITE } from "@/lib/site";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";
import { MotionImage } from "@/components/motion/MotionImage";
import { IMAGES } from "@/lib/images";

export function Location() {
  return (
    <section className="container-x py-28 md:py-40" aria-labelledby="location-title">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        {/* The only satellite map is 884 px wide — capped at 600 CSS px so it stays sharp. */}
        <MotionImage
          src={IMAGES.satellite}
          alt="Satellite map showing Regal Victoria Lakeside on the Victoria Reservoir near Kandy, Digana town, Pallekele Stadium and Victoria Golf & Country Club"
          sizes="(min-width: 1024px) 600px, 100vw"
          className="aspect-[884/523] w-full max-w-[600px] rounded-[28px] lg:col-span-6 lg:justify-self-end"
          parallax={0}
          reveal="left"
          quality={90}
        />
        <div className="flex flex-col justify-center lg:col-span-6">
          <SectionLabel index="04">Location</SectionLabel>
          <SplitHeading
            id="location-title"
            by="lines"
            className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase [&_em]:text-leaf [&_em]:not-italic"
          >
            In the heart of Kandy&apos;s <em>Victoria District</em>
          </SplitHeading>
          <Reveal className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-ink-2">
            <p>{COPY.intro}</p>
            <p>{COPY.neighbourhood}</p>
          </Reveal>
          <Reveal as="ul" mode="children" className="mt-8 flex flex-wrap gap-2" stagger={0.05}>
            {LANDMARKS.map((l) => (
              <li key={l} data-reveal className="flex items-center gap-2 rounded-full border border-forest/15 px-3.5 py-2 text-[0.78rem] text-forest">
                <svg viewBox="0 0 16 16" className="size-3.5 text-sold" aria-hidden>
                  <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 6.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z" fill="currentColor" />
                </svg>
                {l}
              </li>
            ))}
          </Reveal>
          <Reveal className="mt-10">
            <ButtonLink href={SITE.mapsUrl} variant="dark" external>Open in Google Maps</ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
