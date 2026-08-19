"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginUserAction } from "@/lib/actions/user-auth";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginUserAction, undefined);

  return (
    <form action={formAction} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Log in</h1>
        <p className="text-sm text-slate-500">China–Iran logistics monitoring</p>
      </div>

      <input type="hidden" name="next" value={next} />

      <div>
        <label className="field-label">Email</label>
        <input className="field-input" type="email" name="email" autoComplete="email" required />
      </div>

      <div>
        <label className="field-label">Password</label>
        <input
          className="field-input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in..." : "Log in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        No account?{" "}
        <Link href="/register" className="text-brand-600 hover:underline">
          Register with invite code
        </Link>
      </p>
    </form>
  );
}
