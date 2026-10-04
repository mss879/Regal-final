import { after, NextResponse, userAgent, type NextRequest } from "next/server";
import { env, writesConfigured } from "@/lib/env";
import { PUBLIC_PATHS } from "@/lib/routes";
import { clientIp, hashKey } from "@/lib/analytics/hash";
import { BOT_UA } from "@/lib/analytics/bots";
import { colomboDateKey } from "@/lib/time";
import { createServiceClient } from "@/lib/supabase/admin";

// Receives page-view beacons from src/instrumentation-client.ts. Always answers 204 — the
// browser has nothing to wait for — and silently drops anything it won't record: other
// origins, localhost, bots, unknown paths, oversized bodies, or when Supabase isn't configured.
const MAX_BODY = 2048;
const done = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

const clean = (v: unknown, max = 100) =>
  typeof v === "string" && v.trim() ? v.trim().replace(/[^\w .:/@+-]/g, "").slice(0, max) || null : null;

function referrerHost(raw: unknown, ownHost: string | null): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host && host !== ownHost?.replace(/^www\./, "").split(":")[0] ? host.slice(0, 255) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Same-origin beacons only.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return done();
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return done();

  // Local development shares the production database, so local visits are never counted.
  const hostname = (host ?? "").replace(/:\d+$/, "");
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".local")) return done();

  if (!writesConfigured()) return done();
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return done();

  const text = await request.text();
  if (text.length > MAX_BODY) return done();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return done();
  }

  const path = typeof body.path === "string" ? body.path : "";
  if (!PUBLIC_PATHS.has(path)) return done();

  const ua = userAgent(request);
  if (ua.isBot || !ua.ua || BOT_UA.test(ua.ua)) return done();

  const country = (request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? "").toUpperCase();
  const row = {
    path,
    referrer_host: referrerHost(body.referrer, host),
    utm_source: clean(body.utm_source),
    utm_medium: clean(body.utm_medium),
    utm_campaign: clean(body.utm_campaign),
    device: ua.device.type === "mobile" ? "mobile" : ua.device.type === "tablet" ? "tablet" : "desktop",
    browser: ua.browser.name?.slice(0, 40) ?? null,
    country: /^[A-Z]{2}$/.test(country) && country !== "XX" && country !== "T1" ? country : null,
    // Rotates daily (the date is part of the hash); the IP itself is never stored.
    visitor_hash: hashKey(env.analyticsSalt!, "visitor", colomboDateKey(Date.now()), clientIp(request.headers) ?? "", ua.ua),
  };

  after(async () => {
    const { error } = await createServiceClient().from("page_views").insert(row);
    if (error) console.error("[track] insert failed:", error.message);
  });

  return done();
}
