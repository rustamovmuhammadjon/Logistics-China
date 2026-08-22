"use client";

import { Shield } from "lucide-react";
import { useApiSubmit } from "@/lib/hooks";

export default function AdminLoginPage() {
  const { submitForm, pending, error } = useApiSubmit();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(e) => submitForm(e, "/api/auth/admin/login", { redirectTo: "/admin" })}
        className="card w-full max-w-sm space-y-4"
      >
        <div className="flex items-start gap-3">
          <Shield className="h-7 w-7 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin login</h1>
            <p className="text-sm text-slate-500">China–Iran logistics tracker</p>
          </div>
        </div>
        <div>
          <label className="field-label">Username</label>
          <input className="field-input" type="text" name="username" autoComplete="username" required />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input className="field-input" type="password" name="password" autoComplete="current-password" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
