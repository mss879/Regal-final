import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { authConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AdminProfile = { user_id: string; email: string; full_name: string | null };

type Session =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "forbidden"; user: User }
  | { status: "admin"; user: User; admin: AdminProfile; supabase: Awaited<ReturnType<typeof createClient>> };

/**
 * The current staff session, verified with Supabase Auth (getUser() asks the auth server,
 * so revoked sessions are caught) and checked against public.admin_users. Cached per request.
 */
export const getSession = cache(async (): Promise<Session> => {
  if (!authConfigured()) return { status: "unconfigured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };
  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id, email, full_name")
    .eq("user_id", user.id)
    .maybeSingle<AdminProfile>();
  if (!admin) return { status: "forbidden", user };
  return { status: "admin", user, admin, supabase };
});

/**
 * Use at the top of every admin page and every admin Server Action. Redirects anyone who
 * isn't a signed-in admin; returns the admin and a Supabase client acting as them.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (session.status === "admin") return session;
  if (session.status === "forbidden") redirect("/admin/login?error=forbidden");
  redirect("/admin/login");
}
