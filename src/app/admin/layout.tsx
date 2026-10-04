import type { Metadata } from "next";

// The admin area: private, never indexed, and outside the public site's chrome
// (no smooth scrolling, navbar, footer or analytics).
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Regal Victoria Lakeside" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-cream text-ink">{children}</div>;
}
