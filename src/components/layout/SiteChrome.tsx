import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { ChatWidget } from "@/components/chat/ChatWidget";

// The public site's frame: smooth scrolling, the navbar, the footer and the AI assistant. Shared by the
// (site) layout and the root not-found page, which renders outside every route group.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <Nav />
      {children}
      <Footer />
      <ChatWidget />
    </>
  );
}
