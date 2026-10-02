"use client";

import { useId } from "react";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

const COUNTRY_NAMES = Object.values(countries.getNames("en")).sort((a, b) => a.localeCompare(b));

export function CountryField({
  name,
  label,
  defaultValue,
  readOnly = false,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  readOnly?: boolean;
  required?: boolean;
}) {
  const listId = useId();

  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type="text"
        name={name}
        list={listId}
        defaultValue={defaultValue ?? ""}
        readOnly={readOnly}
        required={required}
        autoComplete="off"
        placeholder="Start typing a country…"
      />
      <datalist id={listId}>
        {COUNTRY_NAMES.map((countryName) => (
          <option key={countryName} value={countryName} />
        ))}
      </datalist>
    </div>
  );
}
