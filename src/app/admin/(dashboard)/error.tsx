"use client";

import { buttonClass } from "@/components/admin/ui";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow text-sold">Something went wrong</p>
      <h1 className="mt-3 font-display text-3xl font-light text-forest uppercase">We couldn&apos;t load this page</h1>
      <p className="mt-3 max-w-md text-[0.9rem] text-ink-2">
        Check that the Supabase migrations have been run and try again.
        {error.digest && <span className="mt-2 block text-[0.75rem] text-ink-2/70">Reference: {error.digest}</span>}
      </p>
      <button type="button" onClick={reset} className={buttonClass("primary", "md", "mt-6")}>
        Try again
      </button>
    </div>
  );
}
