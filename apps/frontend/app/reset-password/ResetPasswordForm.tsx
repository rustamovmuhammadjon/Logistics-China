"use client";

import Link from "next/link";
import { Key } from "lucide-react";
import { useApiSubmit } from "@/lib/hooks";

export function ResetPasswordForm() {
  const { submitForm, pending, error } = useApiSubmit();

  return (
    <form
      onSubmit={(e) => submitForm(e, "/api/auth/reset-password", { redirectTo: "/login" })}
      className="card w-full max-w-sm space-y-4"
    >
      <div className="flex items-start gap-3">
        <Key className="h-7 w-7 text-brand-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reset password</h1>
          <p className="text-sm text-slate-500">Ask an admin for the registration code first. Then set a new password here.</p>
        </div>
      </div>

      <div>
        <label className="field-label">Email</label>
        <input className="field-input" type="email" name="email" autoComplete="email" required />
      </div>
      <div>
        <label className="field-label">Registration code from admin</label>
        <input className="field-input" type="text" name="inviteCode" required />
      </div>
      <div>
        <label className="field-label">New password (min. 8 characters)</label>
        <input className="field-input" type="password" name="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="field-label">Confirm new password</label>
        <input
          className="field-input"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Remembered it?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
