import { SITE } from "@/lib/site";
import { IMAGES } from "@/lib/images";
import { ButtonLink } from "@/components/ui/Button";
import { MotionImage } from "@/components/motion/MotionImage";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";

// Closing call to action: copy on forest green beside a half-width render (the renders
// are ~1100 px, so they stay sharp at half the page width rather than full-bleed).
export function CtaBand({
  title = (
    <>
      Make yourself <em>at home</em>
    </>
  ),
  body = "Enquire about the villas now released for pre-booking, or arrange a visit to the site in Digana.",
  image = IMAGES.cta,
  imageAlt = "A villa living room opening onto the reservoir and the hills",
  href = "/contact",
}: {
  title?: React.ReactNode;
  body?: string;
  image?: string;
  imageAlt?: string;
  href?: string;
}) {
  return (
    <section className="px-3 pb-3 md:px-4 md:pb-4" aria-labelledby="cta-title">
      <div className="grain relative grid overflow-hidden rounded-[36px] bg-forest text-paper lg:grid-cols-2">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 size-[480px] rounded-full bg-leaf/25 blur-[120px]" />
        <div className="relative z-10 flex flex-col justify-end p-6 pt-16 md:p-14 lg:min-h-[620px]">
          <SplitHeading
            id="cta-title"
            by="lines"
            className="font-display text-display font-light tracking-[-0.03em] uppercase [&_em]:font-serif [&_em]:tracking-normal [&_em]:text-lime [&_em]:normal-case"
          >
            {title}
          </SplitHeading>
          <Reveal className="mt-8">
            <p className="max-w-md text-[0.95rem] leading-relaxed text-paper/80">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={href} variant="light">Make an enquiry</ButtonLink>
              <ButtonLink href={SITE.phoneHref} variant="outline-light" arrow={false}>Call {SITE.phone}</ButtonLink>
            </div>
          </Reveal>
        </div>
        <div className="p-3 pt-0 md:p-4 lg:pl-0">
          <MotionImage
            src={image}
            alt={imageAlt}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3] h-full rounded-[26px] lg:aspect-auto lg:min-h-[588px]"
            reveal="right"
            parallax={4}
            quality={90}
          />
        </div>
      </div>
    </section>
  );
}
