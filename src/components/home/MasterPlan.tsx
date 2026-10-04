import { InteractiveMap } from "@/components/map/InteractiveMap";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";
import { Counter } from "@/components/motion/Counter";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LOTS, lotCounts } from "@/lib/lots";

export function MasterPlan() {
  const c = lotCounts();
  const lots = LOTS.map(({ id, label, phase, status, slug, perches, bedrooms, areas, tagline, hero, polygon }) => ({
    id, label, phase, status, slug, perches, bedrooms, areas, tagline, hero, polygon,
  }));
  const stats = [
    { n: c.total, label: "Personalised villas" },
    { n: c.released, label: "Released for pre-booking" },
    { n: c.sold, label: "Already sold" },
    { n: c.designStage, label: "In design" },
  ];

  return (
    <section id="master-plan" className="scroll-mt-4 px-3 md:px-4" aria-labelledby="plan-title">
      <div className="grain relative overflow-hidden rounded-[36px] bg-forest py-20 text-paper md:py-28">
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-leaf/20 blur-[120px]" />
        <div className="container-x relative">
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <SectionLabel index="03" tone="light">The master plan</SectionLabel>
              <SplitHeading
                id="plan-title"
                by="words"
                className="mt-6 font-display text-display font-light tracking-[-0.03em] uppercase [&_em]:text-lime [&_em]:not-italic"
              >
                Fifteen villas. <em>One lakefront.</em>
              </SplitHeading>
            </div>
            <Reveal className="text-[0.95rem] leading-relaxed text-sage-2 md:col-span-5">
              <p>
                An elevated peninsula wrapped by the Victoria Reservoir — released in two phases around the Victoria
                Clubhouse, an infinity pool on the rocks, a padel court, open-air gym and a jogging track that follows the water. Move across the plan to explore each
                lot.
              </p>
            </Reveal>
          </div>

          <Reveal mode="children" className="mt-12 mb-10 grid grid-cols-2 gap-6 border-y border-paper/10 py-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} data-reveal>
                <p className="font-display text-5xl leading-none font-light md:text-6xl">
                  <Counter value={s.n} pad={2} />
                </p>
                <p className="mt-2 text-[0.78rem] text-sage">{s.label}</p>
              </div>
            ))}
          </Reveal>

          <InteractiveMap lots={lots} />
        </div>
      </div>
    </section>
  );
}
