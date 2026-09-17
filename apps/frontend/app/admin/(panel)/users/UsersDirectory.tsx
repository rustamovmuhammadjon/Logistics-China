"use client";

import { useMemo, useState } from "react";
import { Copy, Search, Trash2 } from "lucide-react";
import {
  ageFromDob,
  displayName,
  formatDate,
  roleLabel,
  type AdminUserDto,
} from "@logistics/shared";

const ROLE_BADGE_CLASS: Record<string, string> = {
  CONSIGNEE: "badge-green",
  COMPANY: "badge-green",
  EMPLOYEE: "badge-slate",
  OPERATOR: "badge-amber",
};
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { useApiSubmit } from "@/lib/hooks";

export function UsersDirectory({
  users,
  registrationCode,
}: {
  users: AdminUserDto[];
  registrationCode: string;
}) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const { submit, pending, error } = useApiSubmit();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const hay = [
        user.firstName,
        user.lastName,
        user.companyName,
        user.email,
        user.phone,
        user.linkCode,
        user.id,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, users]);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-900">Password reset code</h2>
        <p className="text-sm text-slate-500">
          A user who forgot their password must ask you for this registration code, then set a new password at{" "}
          <span className="font-medium text-slate-700">/reset-password</span>. It does not reset by itself.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
            {registrationCode || "REGISTRATION_CODE is not set"}
          </code>
          {registrationCode && (
            <button type="button" className="btn-secondary" onClick={() => copy(registrationCode, "code")}>
              <Copy className="h-4 w-4" />
              {copied === "code" ? "Copied" : "Copy code"}
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="field-input pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone or ID"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No users match that search.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((user) => {
            const age = ageFromDob(user.dateOfBirth);
            return (
              <li key={user.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      photoUrl={user.photoUrl}
                      firstName={user.firstName}
                      lastName={user.lastName}
                      email={user.email}
                      size={48}
                    />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{displayName(user)}</h2>
                      <p className="text-xs text-slate-400">Joined {formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={ROLE_BADGE_CLASS[user.role] ?? "badge-slate"}>{roleLabel(user.role)}</span>
                    <ConfirmButton
                      confirmText={`Delete ${displayName(user)} and all of their orders, trucks, files and account data? This cannot be undone.`}
                      disabled={pending}
                      onConfirm={() => submit(`/api/admin/users/${user.id}`, { method: "DELETE" })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </ConfirmButton>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Info label="ID" value={user.linkCode} onCopy={() => copy(user.linkCode, user.id)} copied={copied === user.id} />
                  <Info label="Age" value={age != null ? `${age}` : "Not set"} />
                  <Info label="Email" value={user.email} />
                  <Info label="Phone" value={user.phone || "—"} />
                  {(user.role === "CONSIGNEE" || user.role === "COMPANY") && (
                    <Info label="Orders" value={String(user.ownedOrderCount)} />
                  )}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div>
      <dt className="field-label mb-0">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 text-sm text-slate-800">
        <span className="break-all">{value}</span>
        {onCopy && (
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={onCopy} title="Copy">
            {copied ? "Copied" : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </dd>
    </div>
  );
}
