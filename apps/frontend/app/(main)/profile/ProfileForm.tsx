"use client";

import { toDateInputValue } from "@logistics/shared";
import { useApiSubmit } from "@/lib/hooks";

export function ProfileForm({
  isCompany = false,
  companyName,
  firstName,
  lastName,
  phone,
  email,
  dateOfBirth,
  readOnly = false,
}: {
  isCompany?: boolean;
  companyName?: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string;
  dateOfBirth: string | null;
  readOnly?: boolean;
}) {
  const { submitForm, pending, error } = useApiSubmit();

  return (
    <form
      onSubmit={readOnly ? (e) => e.preventDefault() : (e) => submitForm(e, "/api/profile", { method: "PATCH" })}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {readOnly && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
          Your company manages this information — ask them to make changes.
        </p>
      )}
      {isCompany ? (
        <div className="sm:col-span-2">
          <label className="field-label">Company name</label>
          <input className="field-input" type="text" name="companyName" defaultValue={companyName ?? ""} required />
        </div>
      ) : (
        <>
          <div>
            <label className="field-label">First name</label>
            <input
              className="field-input"
              type="text"
              name="firstName"
              defaultValue={firstName ?? ""}
              pattern="^[\p{L}\s]+$"
              title="Letters only, no numbers or symbols"
              readOnly={readOnly}
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
              readOnly={readOnly}
              required
            />
          </div>
          <div>
            <label className="field-label">Date of birth</label>
            <input
              className="field-input"
              type="date"
              name="dateOfBirth"
              defaultValue={toDateInputValue(dateOfBirth)}
              readOnly={readOnly}
              required
            />
          </div>
        </>
      )}
      <div>
        <label className="field-label">Phone number</label>
        <input className="field-input" type="text" name="phone" defaultValue={phone ?? ""} readOnly={readOnly} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Email (used to log in)</label>
        <input className="field-input" type="email" name="email" defaultValue={email} readOnly={readOnly} required />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {!readOnly && (
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </form>
  );
}
