import { SplitHeading } from "@/components/motion/SplitHeading";
import { Counter } from "@/components/motion/Counter";
import { Reveal } from "@/components/motion/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { ArchitectMark } from "@/components/ui/ArchitectMark";
import { TEAM } from "@/lib/site";

const STATS = [
  { value: 15, pad: 2, label: "Bespoke villas" },
  { value: 2, pad: 2, label: "Release phases" },
];

export function Statement() {
  return (
    <section className="container-x py-28 md:py-40" aria-labelledby="statement-title">
      <div className="grid gap-14 md:grid-cols-12">
        <div className="flex flex-col justify-between gap-12 md:col-span-4">
          <SectionLabel index="01">About us</SectionLabel>
          <Reveal mode="children" className="grid grid-cols-2 gap-x-6 gap-y-8">
            {STATS.map((s) => (
              <div key={s.label} data-reveal>
                <p className="font-display text-[clamp(2.2rem,3.4vw,3.2rem)] leading-none font-light text-forest">
                  <Counter value={s.value} pad={s.pad} />
                </p>
                <p className="mt-3 text-[0.78rem] leading-snug text-ink-2">{s.label}</p>
              </div>
            ))}
            <div data-reveal className="col-span-2 border-t border-forest/15 pt-7">
              <div className="flex items-center gap-4">
                <ArchitectMark className="h-[clamp(2.2rem,3.4vw,3.2rem)] shrink-0" />
                <div>
                  <p className="eyebrow text-leaf">Award-winning design</p>
                  <p className="mt-1.5 font-display text-[1.35rem] leading-tight text-forest">{TEAM.architect.name}</p>
                </div>
              </div>
              <p className="mt-4 text-[0.78rem] leading-snug text-ink-2">
                Designed by an internationally recognised, award-winning practice led by Madhura Prematilleke, known for
                contemporary architecture attuned to nature and context.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="md:col-span-8">
          <SplitHeading
            id="statement-title"
            accent
            by="words"
            className="font-display text-title font-normal tracking-[-0.02em] text-forest uppercase text-balance md:text-right [&_em]:text-leaf [&_em]:not-italic"
          >
            Every villa is a dialogue between <em>contemporary architecture</em>, <em>nature</em>, and the family who calls
            it home.
          </SplitHeading>
          <Reveal className="mt-12 flex md:justify-end">
            <ButtonLink href="/about" variant="outline" className="shrink-0">Our story</ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
