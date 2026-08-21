"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";

export function ProfileForm({
  firstName,
  lastName,
  phone,
  email,
}: {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, undefined);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">First name</label>
        <input className="field-input" type="text" name="firstName" defaultValue={firstName ?? ""} />
      </div>
      <div>
        <label className="field-label">Last name</label>
        <input className="field-input" type="text" name="lastName" defaultValue={lastName ?? ""} />
      </div>
      <div>
        <label className="field-label">Phone number</label>
        <input className="field-input" type="text" name="phone" defaultValue={phone ?? ""} />
      </div>
      <div>
        <label className="field-label">Email (used to log in)</label>
        <input className="field-input" type="email" name="email" defaultValue={email} required />
      </div>

      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}

      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
