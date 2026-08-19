"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={formAction} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin login</h1>
          <p className="text-sm text-slate-500">China–Iran logistics tracker</p>
        </div>

        <div>
          <label className="field-label">Username</label>
          <input
            className="field-input"
            type="text"
            name="username"
            autoComplete="username"
            required
          />
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
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
