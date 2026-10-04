import { PageHero } from "@/components/layout/PageHero";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ButtonLink } from "@/components/ui/Button";
import { IMAGES } from "@/lib/images";

// Renders inside the root layout only (outside the (site) group), so it brings its own chrome.
export default function NotFound() {
  return (
    <SiteChrome>
      <main>
        <PageHero
          eyebrow="404"
          title={
            <>
              Lost by <em>the lake</em>
            </>
          }
          body={<p>The page you were looking for has moved or never existed. The villas, though, are right where we left them.</p>}
          image={IMAGES.notFound}
          imageAlt="Looking across the Victoria Reservoir from a villa garden"
        >
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/" variant="light">Back to home</ButtonLink>
            <ButtonLink href="/villas" variant="outline-light" arrow={false}>See the villas</ButtonLink>
          </div>
        </PageHero>
      </main>
    </SiteChrome>
  );
}
