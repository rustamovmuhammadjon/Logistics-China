"use client";

import { useState } from "react";

export function DgBadge({ dangerousGoods, className = "" }: { dangerousGoods: boolean; className?: string }) {
  return (
    <span
      className={`${dangerousGoods ? "badge-red" : "badge-green"} font-semibold ${className}`}
      title={dangerousGoods ? "Dangerous goods" : "Not dangerous goods"}
    >
      {dangerousGoods ? "DG" : "non-DG"}
    </span>
  );
}

const BUTTON = "flex-1 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition sm:flex-none sm:min-w-[110px]";

// Posts as a plain form field ("dangerousGoods"), so it works with the
// uncontrolled formToJson() forms the order pages already use.
export function DgToggle({ defaultValue = false }: { defaultValue?: boolean }) {
  const [dangerousGoods, setDangerousGoods] = useState(defaultValue);

  return (
    <div>
      <label className="field-label">Cargo type</label>
      <div className="flex gap-2" role="radiogroup" aria-label="Cargo type">
        <button
          type="button"
          role="radio"
          aria-checked={dangerousGoods}
          onClick={() => setDangerousGoods(true)}
          className={`${BUTTON} ${
            dangerousGoods
              ? "border-red-600 bg-red-600 text-white shadow-sm"
              : "border-red-200 bg-white text-red-600 hover:bg-red-50"
          }`}
        >
          DG
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!dangerousGoods}
          onClick={() => setDangerousGoods(false)}
          className={`${BUTTON} ${
            !dangerousGoods
              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
              : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          non-DG
        </button>
      </div>
      <input type="hidden" name="dangerousGoods" value={dangerousGoods ? "true" : "false"} />
      <p className="mt-1 text-xs text-slate-400">DG = dangerous goods. Applies to every sub-order in this order.</p>
    </div>
  );
}
