import { brochureSlides } from "@/lib/assets";
import { SITE } from "@/lib/site";
import { PageHero } from "@/components/layout/PageHero";
import { GalleryGrid, LightboxButton } from "@/components/villas/Gallery";
import { Arrow, buttonClass } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/schema";

export const metadata = pageMetadata({
  title: "Brochure — villas, master plan and amenities",
  description: `The ${SITE.name} brochure — the lakefront setting, the master plan, the amenities and every villa now released for pre-booking in Digana, Kandy.`,
  path: "/brochure",
});

export default function BrochurePage() {
  const slides = brochureSlides().map((s, i) => ({ ...s, alt: `Brochure page ${i + 1}` }));
  return (
    <main>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Brochure", path: "/brochure" }])} />
      <PageHero
        eyebrow="Brochure · September 2026"
        title={
          <>
            The <em>brochure</em>
          </>
        }
        body={<p>Every page of the {SITE.name} brochure — the setting, the master plan, the amenities and the villas now released.</p>}
        image="/images/brochure/cover.jpg"
        imageAlt="Cover of the Regal Victoria Lakeside brochure"
        imagePosition="50% 30%"
      >
        <LightboxButton slides={slides} autoplay label="Play the brochure as a slideshow" className={buttonClass("light")}>
          Play as slideshow <Arrow />
        </LightboxButton>
      </PageHero>

      <section className="container-x py-24 md:py-32" aria-label="Brochure pages">
        <GalleryGrid slides={slides} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
      </section>
    </main>
  );
}
