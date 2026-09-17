"use client";

import { useState } from "react";
import Link from "next/link";
import { UserAdd } from "iconsax-react";
import { useApiSubmit } from "@/lib/hooks";

type Role = "CONSIGNEE" | "OPERATOR" | "COMPANY";

export function RegisterForm({ next }: { next: string }) {
  const { submitForm, pending, error } = useApiSubmit();
  const [role, setRole] = useState<Role>("CONSIGNEE");
  const isCompany = role === "COMPANY";

  return (
    <form
      onSubmit={(e) => submitForm(e, "/api/auth/register", { redirectTo: next })}
      className="card w-full max-w-md space-y-4"
    >
      <div className="flex items-start gap-3">
        <UserAdd size={28} variant="Bold" color="#1d4e89" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create an account</h1>
          <p className="text-sm text-slate-500">You'll need the invite code.</p>
        </div>
      </div>

      <div>
        <label className="field-label">Account type</label>
        <div className="flex flex-col gap-2 text-sm text-slate-700 sm:flex-row sm:flex-wrap sm:gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="CONSIGNEE"
              checked={role === "CONSIGNEE"}
              onChange={() => setRole("CONSIGNEE")}
              required
            />
            Individual Entrepreneur (places orders)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="COMPANY"
              checked={role === "COMPANY"}
              onChange={() => setRole("COMPANY")}
              required
            />
            Company (manages employees)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="OPERATOR"
              checked={role === "OPERATOR"}
              onChange={() => setRole("OPERATOR")}
              required
            />
            Operator (updates truck location)
          </label>
        </div>
      </div>

      <div>
        <label className="field-label">Invite code</label>
        <input className="field-input" type="text" name="inviteCode" required />
      </div>

      {isCompany ? (
        <div>
          <label className="field-label">Company name</label>
          <input className="field-input" type="text" name="companyName" required />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">First name</label>
              <input
                className="field-input"
                type="text"
                name="firstName"
                pattern="^[\p{L}\s]+$"
                title="Letters only, no numbers or symbols"
                required
              />
            </div>
            <div>
              <label className="field-label">Last name</label>
              <input
                className="field-input"
                type="text"
                name="lastName"
                pattern="^[\p{L}\s]+$"
                title="Letters only, no numbers or symbols"
                required
              />
            </div>
          </div>

          <div>
            <label className="field-label">Date of birth</label>
            <input className="field-input" type="date" name="dateOfBirth" required />
          </div>
        </>
      )}

      <div>
        <label className="field-label">Email</label>
        <input className="field-input" type="email" name="email" autoComplete="email" required />
      </div>
      <div>
        <label className="field-label">Password (min. 8 characters)</label>
        <input className="field-input" type="password" name="password" autoComplete="new-password" minLength={8} required />
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
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
