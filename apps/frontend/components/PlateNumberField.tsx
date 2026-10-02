"use client";

import type { ReactNode } from "react";

// Letters/digits only — no spaces, hyphens, or other punctuation — and
// always uppercase as you type. Latin-only falls out for free: toUpperCase()
// on a non-Latin letter stays outside A-Z, so the filter below drops it.
function cleanPlateChars(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function PlateNumberField({
  name,
  label,
  defaultValue,
  readOnly = false,
  required = false,
  placeholder,
  list,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  // For a "search an existing plate" field — pair with a sibling
  // <datalist id={list}> (passed as children) instead of creating one.
  list?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type="text"
        name={name}
        list={list}
        defaultValue={defaultValue ?? ""}
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        onInput={(e) => {
          const el = e.currentTarget;
          const cleaned = cleanPlateChars(el.value);
          if (cleaned !== el.value) el.value = cleaned;
        }}
      />
      {children}
    </div>
  );
}
