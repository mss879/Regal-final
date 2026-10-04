import { Hero } from "@/components/home/Hero";
import { Statement } from "@/components/home/Statement";
import { FeatureTriptych } from "@/components/home/FeatureTriptych";
import { Showcase } from "@/components/home/Showcase";
import { MasterPlan } from "@/components/home/MasterPlan";
import { Amenities } from "@/components/home/Amenities";
import { Location } from "@/components/home/Location";
import { CtaBand } from "@/components/home/CtaBand";
import { HomeIntro } from "@/components/intro/HomeIntro";
import { brochureSlides } from "@/lib/assets";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata = pageMetadata({
  title: `${SITE.name} — Luxury Lakefront Villas in Kandy, Sri Lanka`,
  absoluteTitle: true,
  description:
    "Fully furnished contemporary villas on a private lakefront above the Victoria Reservoir in Digana, Kandy. Infinity pool, clubhouse and 24-hour security.",
  path: "/",
});

export default function Home() {
  const brochure = brochureSlides().map((s, i) => ({ ...s, alt: `Regal Victoria Lakeside brochure, page ${i + 1}` }));
  return (
    <>
      <HomeIntro />
      <main>
        <Hero />
        <Statement />
        <FeatureTriptych />
        <Amenities />
        <Showcase brochure={brochure} />
        <MasterPlan />
        <Location />
        <CtaBand />
      </main>
    </>
  );
}
