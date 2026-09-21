"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Pencil, UserPlus } from "lucide-react";
import { formatDate, type OperatorEmployeeDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function OperatorsManager({ operators }: { operators: OperatorEmployeeDto[] }) {
  const { submit, pending, error } = useApiSubmit();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add an operator</h2>
          <button type="button" className="btn-secondary text-xs" onClick={() => setShowAdd((v) => !v)}>
            <UserPlus className="h-3.5 w-3.5" />
            {showAdd ? "Close" : "Add operator"}
          </button>
        </div>
        {showAdd && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const result = await submit("/api/operator-company/operators", { body: formToJson(form) });
              if (result) {
                form.reset();
                setShowAdd(false);
              }
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <Field name="firstName" label="First name" pattern="^[\p{L}\s]+$" />
            <Field name="lastName" label="Last name" pattern="^[\p{L}\s]+$" />
            <Field name="email" label="Email" type="email" />
            <Field name="phone" label="Phone" />
            <Field name="dateOfBirth" label="Date of birth" type="date" />
            <div className="sm:col-span-2">
              <Field name="password" label="Password (min. 8 characters)" type="password" minLength={8} />
            </div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? "Adding…" : "Add operator"}
              </button>
            </div>
          </form>
        )}
      </div>

      {operators.length === 0 ? (
        <p className="card text-center text-slate-400">No operators yet.</p>
      ) : (
        <ul className="space-y-3">
          {operators.map((operator) => (
            <li key={operator.id} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {[operator.firstName, operator.lastName].filter(Boolean).join(" ") || operator.email}
                    {!operator.active && <span className="badge-red ml-2 text-[10px]">Deactivated</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {operator.email}
                    {operator.phone ? ` · ${operator.phone}` : ""} · joined {formatDate(operator.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge-slate">{operator.linkedAccountCount} linked account(s)</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setEditingId((id) => (id === operator.id ? null : operator.id))}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editingId === operator.id ? "Close" : "Edit"}
                </button>
                {operator.active ? (
                  <ConfirmButton
                    className="btn-danger text-xs"
                    confirmText={`Deactivate ${operator.email}? They won't be able to log in, but their existing links and history stay intact.`}
                    disabled={pending}
                    onConfirm={() => submit(`/api/operator-company/operators/${operator.id}/deactivate`, { method: "POST" })}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Deactivate
                  </ConfirmButton>
                ) : (
                  <ConfirmButton
                    className="btn-secondary text-xs"
                    confirmText={`Reactivate ${operator.email}?`}
                    disabled={pending}
                    onConfirm={() => submit(`/api/operator-company/operators/${operator.id}/activate`, { method: "POST" })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Reactivate
                  </ConfirmButton>
                )}
              </div>

              {editingId === operator.id && (
                <EditOperatorForm operator={operator} onDone={() => setEditingId(null)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditOperatorForm({ operator, onDone }: { operator: OperatorEmployeeDto; onDone: () => void }) {
  const { submit, pending, error } = useApiSubmit();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await submit(`/api/operator-company/operators/${operator.id}`, {
          method: "PATCH",
          body: formToJson(e.currentTarget),
        });
        if (result) onDone();
      }}
      className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2"
    >
      <Field name="firstName" label="First name" pattern="^[\p{L}\s]+$" defaultValue={operator.firstName ?? ""} />
      <Field name="lastName" label="Last name" pattern="^[\p{L}\s]+$" defaultValue={operator.lastName ?? ""} />
      <Field name="email" label="Email" type="email" defaultValue={operator.email} />
      <Field name="phone" label="Phone" defaultValue={operator.phone ?? ""} />
      <Field
        name="dateOfBirth"
        label="Date of birth"
        type="date"
        defaultValue={operator.dateOfBirth ? operator.dateOfBirth.slice(0, 10) : ""}
      />
      <p className="text-xs text-slate-400 sm:col-span-2">
        Password can only be changed by the operator themselves, from their own profile.
      </p>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  pattern,
  minLength,
  required = true,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  pattern?: string;
  minLength?: number;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        name={name}
        pattern={pattern}
        minLength={minLength}
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
}
