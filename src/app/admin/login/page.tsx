import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/dal";
import { missingEnv } from "@/lib/env";
import { signOut } from "@/lib/admin/actions/auth";
import { Logo } from "@/components/ui/Logo";
import { SubmitButton } from "@/components/admin/client";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (session.status === "admin") redirect("/admin");
  // Only same-site admin paths survive (the sign-in action re-checks this too).
  const next = typeof params.next === "string" && params.next.startsWith("/admin") && !params.next.startsWith("//") ? params.next : undefined;
  const missing = missingEnv();

  return (
    <main className="grid min-h-dvh gap-3 p-3 md:p-4 lg:grid-cols-2">
      <section className="grain relative hidden overflow-hidden rounded-[36px] bg-forest text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 size-[560px] rounded-full bg-leaf/25 blur-[140px]" />
        <Logo className="relative w-52 text-paper" />
        <div className="relative">
          <p className="eyebrow flex items-center gap-3 text-lime">
            <span className="size-1.5 rounded-full bg-lime" /> Admin
          </p>
          <p className="mt-6 font-display text-display font-light tracking-[-0.035em] uppercase">
            Welcome <span className="font-serif tracking-normal text-lime normal-case italic">back</span>
          </p>
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-sage-2">
            Enquiries, the sales pipeline and site viewings for Regal Victoria Lakeside.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center rounded-[36px] bg-paper px-5 py-16 md:px-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 w-40 text-forest lg:hidden" />
          <h1 className="font-display text-3xl font-light tracking-[-0.01em] text-forest uppercase">Staff sign in</h1>

          {session.status === "unconfigured" ? (
            <div className="mt-6 space-y-4 text-[0.9rem] leading-relaxed text-ink-2">
              <p className="rounded-xl border border-design/30 bg-design/5 px-4 py-3 text-forest">
                The admin area isn&apos;t connected to Supabase yet.
              </p>
              <p>Add these to <code className="rounded bg-forest/5 px-1.5 py-0.5 text-[0.82rem]">.env.local</code> (and your host&apos;s environment settings), then restart:</p>
              <ul className="space-y-1.5">
                {missing.map((m) => (
                  <li key={m}>
                    <code className="rounded bg-forest/5 px-1.5 py-0.5 text-[0.82rem] text-forest">{m}</code>
                  </li>
                ))}
              </ul>
              <p>Then run the migrations and create your admin user — the README has the steps.</p>
            </div>
          ) : session.status === "forbidden" || params.error === "forbidden" ? (
            <div className="mt-6 space-y-5 text-[0.9rem] leading-relaxed text-ink-2">
              <p className="rounded-xl border border-sold/25 bg-sold/5 px-4 py-3 text-sold">
                {session.status === "forbidden" ? `${session.user.email} doesn't` : "This account doesn't"} have access to the admin area. Ask an
                administrator to add you to <code>admin_users</code>.
              </p>
              {session.status === "forbidden" && (
                <form action={signOut}>
                  <SubmitButton variant="outline">Sign out</SubmitButton>
                </form>
              )}
            </div>
          ) : (
            <>
              <p className="mt-3 mb-8 text-[0.9rem] text-ink-2">Use the email and password from your staff account.</p>
              <LoginForm next={next} />
            </>
          )}

          <Link href="/" className="mt-10 inline-block text-[0.82rem] text-ink-2 underline-offset-4 hover:text-forest hover:underline">
            ← Back to the website
          </Link>
        </div>
      </section>
    </main>
  );
}
