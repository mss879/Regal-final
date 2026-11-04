import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";

/** JSON for the admin API routes: never cached, 401 when the staff session has ended. */
export const adminJson = <T extends { ok: boolean }>(data: T, status = data.ok ? 200 : 400) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

/** The signed-in admin's Supabase client, or null (the route answers 401). */
export async function adminClient() {
  const session = await getSession();
  return session.status === "admin" ? session.supabase : null;
}

export const signedOut = () => adminJson({ ok: false, error: "Your session has ended. Please sign in again." }, 401);
