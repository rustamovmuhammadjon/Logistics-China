"use client";

import { useState } from "react";
import { X } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Controlled under the hood (the library needs that to format as you type
// and detect the country), but still drops into this app's plain
// <form>+FormData submission — `name` is forwarded straight to the
// underlying native <input>, so formToJson() picks up the clean "+<country
// code><number>" value exactly like any other field.
export function PhoneField({
  name,
  label,
  defaultValue,
  readOnly = false,
  required = false,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState<string | undefined>(() => {
    if (!defaultValue) return undefined;
    return defaultValue.startsWith("+") ? defaultValue : `+${defaultValue}`;
  });

  // Optional fields need an obvious way to blank out an already-set number
  // — backspacing a formatted international value back to nothing isn't
  // always straightforward, so give it an explicit clear button instead.
  const clearable = !readOnly && !required && Boolean(value);

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="flex items-center gap-1.5">
        <PhoneInput
          className="phone-input flex-1"
          name={name}
          value={value}
          onChange={setValue}
          defaultCountry="UZ"
          international
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
        />
        {clearable && (
          <button
            type="button"
            onClick={() => setValue(undefined)}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={`Clear ${label}`}
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
