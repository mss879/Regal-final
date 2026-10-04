import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Vercel preview deployments inject the feedback toolbar from vercel.live.
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

// No nonces, so every public page stays statically rendered. 'unsafe-inline' is needed for
// Next's inline RSC payload, the home intro's pre-paint script and inline style attributes.
// The browser never talks to Supabase directly (auth runs in Server Actions), so connect-src
// stays 'self'.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}${vercelLive}`,
  `frame-src 'self'${vercelLive}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()",
  },
];

// Files in public/ are served with max-age=0 by default. Their names are stable, so cache
// them for a week and revalidate in the background after that.
const staticCache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];

const nextConfig: NextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    qualities: [75, 90],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Turbopack's build cache (.next/cache/turbopack, on by default since 16.3) stores a snapshot
    // of the build environment, secret env values included. Netlify keeps that folder between
    // builds and its secret scanner fails the deploy when it finds them, so don't write it.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/images/:path*", headers: staticCache },
      { source: "/intro/:path*", headers: staticCache },
      { source: "/icons/:path*", headers: staticCache },
      { source: "/:file([^/]+\\.(?:mp4|jpg))", headers: staticCache },
    ];
  },
};

export default nextConfig;
