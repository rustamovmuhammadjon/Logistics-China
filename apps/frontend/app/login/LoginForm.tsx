"use client";

import Link from "next/link";
import { LoginCurve } from "iconsax-react";
import { useApiSubmit } from "@/lib/hooks";

export function LoginForm({ next }: { next: string }) {
  const { submitForm, pending, error } = useApiSubmit();

  return (
    <form
      onSubmit={(e) => submitForm(e, "/api/auth/login", { redirectTo: next })}
      className="card w-full max-w-sm space-y-4"
    >
      <div className="flex items-start gap-3">
        <LoginCurve size={28} variant="Bold" color="#1d4e89" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Log in</h1>
          <p className="text-sm text-slate-500">China–Iran logistics monitoring</p>
        </div>
      </div>

      <div>
        <label className="field-label">Email</label>
        <input className="field-input" type="email" name="email" autoComplete="email" required />
      </div>
      <div>
        <label className="field-label">Password</label>
        <input className="field-input" type="password" name="password" autoComplete="current-password" required />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="remember" defaultChecked />
        Remember me
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Forgot your password?{" "}
        <Link href="/reset-password" className="text-brand-600 hover:underline">
          Reset with registration code
        </Link>
      </p>
      <p className="text-center text-sm text-slate-500">
        No account?{" "}
        <Link href="/register" className="text-brand-600 hover:underline">
          Register with invite code
        </Link>
      </p>
    </form>
  );
}
