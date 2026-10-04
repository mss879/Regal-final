"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authConfigured, env, writesConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { clientIp, hashKey } from "@/lib/analytics/hash";

export type SignInState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

/** Only same-site admin paths are allowed as a post-login destination. */
function safeNext(raw: FormDataEntryValue | null): Route {
  const next = typeof raw === "string" ? raw : "";
  if (next.startsWith("/admin") && !next.startsWith("//") && !next.startsWith("/admin/login") && !next.includes("\\")) {
    return next as Route;
  }
  return "/admin";
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!authConfigured()) return { error: "Supabase isn't configured yet — see the setup steps.", email };

  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: "Please enter your email and password.", email };

  // At most 8 attempts per 15 minutes from one connection.
  if (writesConfigured()) {
    const ip = clientIp(await headers());
    if (ip) {
      const { data: allowed } = await createServiceClient().rpc("check_rate_limit", {
        p_bucket: "admin-login",
        p_key: hashKey(env.analyticsSalt!, "login", ip),
        p_limit: 8,
        p_window: "15 minutes",
      });
      if (allowed === false) return { error: "Too many attempts. Please wait 15 minutes and try again.", email };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "That email and password don't match an admin account.", email };

  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have access to the admin area.", email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  if (authConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
