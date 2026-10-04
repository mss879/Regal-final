import { MotionImage } from "@/components/motion/MotionImage";
import { Reveal } from "@/components/motion/Reveal";
import { IMAGES } from "@/lib/images";

const FRAMES = ["aspect-[4/3.3]", "aspect-[4/4.2] md:-mt-16", "aspect-[4/3.3]"];

export function FeatureTriptych() {
  return (
    <section className="container-x pb-28 md:pb-40" aria-label="Inside the villas">
      <div className="grid gap-10 md:grid-cols-3 md:gap-6 md:pt-16">
        {IMAGES.triptych.map((item, i) => (
          <figure key={item.src} className="group">
            <MotionImage
              src={item.src}
              alt={item.title}
              sizes="(min-width: 768px) 33vw, 100vw"
              className={`rounded-[24px] ${FRAMES[i]}`}
              imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              delay={i * 0.12}
              parallax={4}
            />
            <Reveal as="figcaption" className="mt-5 flex items-start justify-between gap-6" delay={0.2 + i * 0.1}>
              <div>
                <p className="font-display text-lg font-medium text-forest">{item.title}</p>
                <p className="mt-1 max-w-xs text-[0.85rem] leading-relaxed text-ink-2">{item.body}</p>
              </div>
              <span className="font-display text-sm text-leaf">0{i + 1}</span>
            </Reveal>
          </figure>
        ))}
      </div>
    </section>
  );
}
