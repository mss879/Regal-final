import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";

// The public site's frame: smooth scrolling, the navbar and the footer. Shared by the
// (site) layout and the root not-found page, which renders outside every route group.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <Nav />
      {children}
      <Footer />
    </>
  );
}
