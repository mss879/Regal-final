import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost, Manrope } from "next/font/google";
import { CREDIT, SITE, TEAM } from "@/lib/site";
import "lenis/dist/lenis.css";
import "./globals.css";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

// Vercel preview deployments must never be indexed. Other hosts don't set VERCEL_ENV.
const indexable = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION || undefined;

// Defaults for every page. Public pages override title, description, canonical and Open Graph
// through pageMetadata() (src/lib/seo.ts). No canonical here: the 404 and admin must not inherit "/".
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  title: {
    default: `${SITE.name} — Luxury Lakefront Villas in Kandy, Sri Lanka`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  creator: CREDIT.name,
  publisher: TEAM.developer.name,
  category: "Real estate",
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    locale: "en_LK",
  },
  twitter: { card: "summary_large_image" },
  robots: indexable
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: false },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#12231a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jost.variable} ${manrope.variable} ${cormorant.variable}`}>
      <head>
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
