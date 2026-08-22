"use client";

import { useApiSubmit } from "@/lib/hooks";

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
  const { submitForm, pending, error } = useApiSubmit();

  return (
    <form onSubmit={(e) => submitForm(e, "/api/profile", { method: "PATCH" })} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">First name</label>
        <input
          className="field-input"
          type="text"
          name="firstName"
          defaultValue={firstName ?? ""}
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
          defaultValue={lastName ?? ""}
          pattern="^[\p{L}\s]+$"
          title="Letters only, no numbers or symbols"
          required
        />
      </div>
      <div>
        <label className="field-label">Phone number</label>
        <input className="field-input" type="text" name="phone" defaultValue={phone ?? ""} />
      </div>
      <div>
        <label className="field-label">Email (used to log in)</label>
        <input className="field-input" type="email" name="email" defaultValue={email} required />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
