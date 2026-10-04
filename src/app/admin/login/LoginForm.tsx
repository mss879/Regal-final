"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/admin/actions/auth";
import { SubmitButton } from "@/components/admin/client";
import { FieldLabel, fieldClass } from "@/components/admin/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <FieldLabel label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} className={fieldClass} />
      </FieldLabel>
      <FieldLabel label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={fieldClass} />
      </FieldLabel>
      {state.error && (
        <p className="rounded-xl border border-sold/25 bg-sold/5 px-4 py-3 text-[0.85rem] text-sold" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
