"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Pencil, UserPlus } from "lucide-react";
import { formatDate, type EmployeeDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function EmployeesManager({ employees }: { employees: EmployeeDto[] }) {
  const { submit, pending, error } = useApiSubmit();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add an employee</h2>
          <button type="button" className="btn-secondary text-xs" onClick={() => setShowAdd((v) => !v)}>
            <UserPlus className="h-3.5 w-3.5" />
            {showAdd ? "Close" : "Add employee"}
          </button>
        </div>
        {showAdd && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const result = await submit("/api/company/employees", { body: formToJson(form) });
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
                {pending ? "Adding…" : "Add employee"}
              </button>
            </div>
          </form>
        )}
      </div>

      {employees.length === 0 ? (
        <p className="card text-center text-slate-400">No employees yet.</p>
      ) : (
        <ul className="space-y-3">
          {employees.map((employee) => (
            <li key={employee.id} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {[employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.email}
                    {!employee.active && <span className="badge-red ml-2 text-[10px]">Deactivated</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {employee.email}
                    {employee.phone ? ` · ${employee.phone}` : ""} · joined {formatDate(employee.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge-slate">{employee.orderCount} orders</span>
                  <span className="badge-green">{employee.completedCount} completed</span>
                  <span className="badge-red">{employee.cancelledCount} cancelled</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setEditingId((id) => (id === employee.id ? null : employee.id))}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editingId === employee.id ? "Close" : "Edit"}
                </button>
                {employee.active ? (
                  <ConfirmButton
                    className="btn-danger text-xs"
                    confirmText={`Deactivate ${employee.email}? They won't be able to log in, but their orders stay with the company.`}
                    disabled={pending}
                    onConfirm={() => submit(`/api/company/employees/${employee.id}/deactivate`, { method: "POST" })}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Deactivate
                  </ConfirmButton>
                ) : (
                  <ConfirmButton
                    className="btn-secondary text-xs"
                    confirmText={`Reactivate ${employee.email}?`}
                    disabled={pending}
                    onConfirm={() => submit(`/api/company/employees/${employee.id}/activate`, { method: "POST" })}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Reactivate
                  </ConfirmButton>
                )}
              </div>

              {editingId === employee.id && (
                <EditEmployeeForm employee={employee} onDone={() => setEditingId(null)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditEmployeeForm({ employee, onDone }: { employee: EmployeeDto; onDone: () => void }) {
  const { submit, pending, error } = useApiSubmit();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await submit(`/api/company/employees/${employee.id}`, {
          method: "PATCH",
          body: formToJson(e.currentTarget),
        });
        if (result) onDone();
      }}
      className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2"
    >
      <Field name="firstName" label="First name" pattern="^[\p{L}\s]+$" defaultValue={employee.firstName ?? ""} />
      <Field name="lastName" label="Last name" pattern="^[\p{L}\s]+$" defaultValue={employee.lastName ?? ""} />
      <Field name="email" label="Email" type="email" defaultValue={employee.email} />
      <Field name="phone" label="Phone" defaultValue={employee.phone ?? ""} />
      <Field
        name="dateOfBirth"
        label="Date of birth"
        type="date"
        defaultValue={employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : ""}
      />
      <div className="sm:col-span-2">
        <Field name="password" label="New password (optional, min. 8 characters)" type="password" minLength={8} required={false} />
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
