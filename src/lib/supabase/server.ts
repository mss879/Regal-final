import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { AUTH_COOKIE_OPTIONS } from "./cookies";

/**
 * Supabase client acting as the signed-in staff member (row-level security applies).
 * Create one per request. Call only when authConfigured() is true.
 */
export async function createClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabasePublishableKey!, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy
          // (src/proxy.ts) refreshes the session on every admin request, so this is safe.
        }
      },
    },
  });
}
