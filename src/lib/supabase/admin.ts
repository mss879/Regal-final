import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client: bypasses row-level security. Server-only, used for the website's own
 * writes (enquiries, page views, rate limits) through narrowly scoped database functions.
 * Never use it to serve admin data — admin pages use the signed-in client instead.
 */
export function createServiceClient() {
  return createClient(env.supabaseUrl!, env.supabaseSecretKey!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
