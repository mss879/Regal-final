import type { CookieOptions } from "@supabase/ssr";

// Auth cookies for staff sessions. Scoped to /admin so they are never sent with requests for
// the public site, and httpOnly because the browser never talks to Supabase directly (sign-in
// and every query run on the server).
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: "/admin",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 14,
};
