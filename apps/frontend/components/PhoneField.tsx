"use client";

import { useState } from "react";
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

  return (
    <div>
      <label className="field-label">{label}</label>
      <PhoneInput
        className="phone-input"
        name={name}
        value={value}
        onChange={setValue}
        defaultCountry="UZ"
        international
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
