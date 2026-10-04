import { SiteChrome } from "@/components/layout/SiteChrome";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteGraph } from "@/lib/schema";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteChrome>
      <JsonLd data={siteGraph()} />
      {children}
    </SiteChrome>
  );
}
