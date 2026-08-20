"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerUserAction } from "@/lib/actions/user-auth";

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(registerUserAction, undefined);

  return (
    <form action={formAction} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Create an account</h1>
        <p className="text-sm text-slate-500">You'll need the invite code.</p>
      </div>

      <input type="hidden" name="next" value={next} />

      <div>
        <label className="field-label">Account type</label>
        <div className="flex gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="CONSIGNEE" defaultChecked required />
            Consignee (places orders)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="OPERATOR" required />
            Operator (updates truck location)
          </label>
        </div>
      </div>

      <div>
        <label className="field-label">Invite code</label>
        <input className="field-input" type="text" name="inviteCode" required />
      </div>

      <div>
        <label className="field-label">Email</label>
        <input className="field-input" type="email" name="email" autoComplete="email" required />
      </div>

      <div>
        <label className="field-label">Password (min. 8 characters)</label>
        <input
          className="field-input"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div>
        <label className="field-label">Confirm password</label>
        <input
          className="field-input"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
