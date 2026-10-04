import { LOTS, STATUS_LABEL } from "@/lib/lots";
import { SITE } from "@/lib/site";
import { ContactForm } from "@/components/contact/ContactForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { MotionImage } from "@/components/motion/MotionImage";
import { Reveal } from "@/components/motion/Reveal";
import { ContactHero } from "@/components/contact/ContactHero";
import { IMAGES } from "@/lib/images";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/schema";

export const metadata = pageMetadata({
  title: "Contact us & book a site visit",
  description: `Enquire about a villa or book a site visit at ${SITE.name}, ${SITE.address}. Call ${SITE.phone} or email ${SITE.email}.`,
  path: "/contact",
});

// Static: the ?lot= pre-selection is read in the browser (see ContactForm's LotPrefill).
export default function ContactPage() {
  const lots = LOTS.map((l) => ({ id: l.id, label: l.label, status: STATUS_LABEL[l.status] }));

  const details = [
    { label: "Visit", value: SITE.address, href: SITE.mapsUrl, external: true },
    { label: "Call", value: SITE.phone, href: SITE.phoneHref },
    { label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
  ];

  return (
    <main>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])} />
      <ContactHero>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col justify-between gap-12 text-paper lg:col-span-5">
            <div>
              <p data-ch-up className="eyebrow flex items-center gap-3 text-lime">
                <span className="size-1.5 rounded-full bg-lime" /> Contact
              </p>
              <h1 data-ch-title className="mt-6 font-display text-display font-light tracking-[-0.035em] uppercase">
                Let&apos;s talk <span className="font-serif tracking-normal text-lime normal-case italic">about home</span>
              </h1>
              <p data-ch-up className="mt-8 max-w-md text-[0.98rem] leading-relaxed text-sage-2">
                Whether you&apos;re ready to pre-book a villa or would simply like to see the site, our team in Digana
                will be happy to help.
              </p>
            </div>
            <ul className="space-y-6 border-t border-paper/15 pt-8">
              {details.map((d) => (
                <li key={d.label} data-ch-up>
                  <p className="eyebrow text-sage">{d.label}</p>
                  <a
                    href={d.href}
                    target={d.external ? "_blank" : undefined}
                    rel={d.external ? "noreferrer" : undefined}
                    className="mt-1 block font-display text-[clamp(1.25rem,2vw,1.6rem)] font-light break-words transition-colors hover:text-lime"
                  >
                    {d.value}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div data-ch-form className="rounded-[28px] bg-paper p-6 md:p-10 lg:col-span-7">
            <p className="eyebrow text-leaf">Enquiry form</p>
            <h2 className="mt-3 mb-10 font-display text-2xl text-forest md:text-3xl">Tell us about your plans</h2>
            <ContactForm lots={lots} />
          </div>
        </div>
      </ContactHero>

      <section className="container-x py-24 md:py-32" aria-labelledby="find-title">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <SectionLabel index="01">Finding us</SectionLabel>
            <h2 id="find-title" className="mt-6 font-display text-title font-normal tracking-[-0.02em] text-forest uppercase">
              Digana, <span className="text-leaf">Kandy</span>
            </h2>
            <Reveal className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-ink-2">
              <p>
                Regal Victoria Lakeside sits on an elevated site bordering the Victoria Reservoir, in one of Digana&apos;s
                most coveted neighbourhoods — close to the Victoria Golf &amp; Country Club, Santani Wellness Resort
                &amp; Spa and Pallekele International Cricket Stadium.
              </p>
              <p className="font-semibold text-forest">{SITE.address}</p>
            </Reveal>
            <Reveal className="mt-8">
              <ButtonLink href={SITE.mapsUrl} external>Get directions</ButtonLink>
            </Reveal>
          </div>
          <MotionImage
            src={IMAGES.satellite}
            alt="Satellite map of the area around Regal Victoria Lakeside"
            sizes="(min-width: 1024px) 600px, 100vw"
            className="aspect-[884/523] w-full max-w-[600px] rounded-[28px] lg:col-span-7 lg:justify-self-end"
            parallax={0}
            reveal="right"
            quality={90}
          />
        </div>
      </section>
    </main>
  );
}
