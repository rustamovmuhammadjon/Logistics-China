"use client";

import { useState } from "react";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";

export function PasswordChangeForm() {
  const { submit, pending, error, setError } = useApiSubmit();
  const [success, setSuccess] = useState(false);

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSuccess(false);
          const form = e.currentTarget;
          const data = formToJson(form);
          if (data.newPassword !== data.confirmNewPassword) {
            setError("New passwords do not match");
            return;
          }
          const result = await submit("/api/profile/password", { body: data, refresh: false });
          if (result) {
            form.reset();
            setSuccess(true);
          }
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className="field-label">Current password</label>
          <input
            className="field-input"
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="field-label">New password (min. 8 characters)</label>
          <input
            className="field-input"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="field-label">Confirm new password</label>
          <input
            className="field-input"
            type="password"
            name="confirmNewPassword"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        {success && <p className="text-sm text-green-600 sm:col-span-2">Password updated.</p>}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
