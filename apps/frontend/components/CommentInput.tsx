"use client";

import { useEffect, useRef, useState } from "react";
import { COMMENT_MAX_LENGTH } from "@logistics/shared";

// Uncontrolled, so the forms around it keep using formToJson() and reset();
// the counter listens for that reset to go back to 0.
export function CommentInput({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => setLength(0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        className="field-input pr-16"
        type="text"
        name="text"
        placeholder={placeholder}
        maxLength={COMMENT_MAX_LENGTH}
        required
        onInput={(e) => setLength(e.currentTarget.value.length)}
      />
      <span
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums ${
          length >= COMMENT_MAX_LENGTH ? "text-red-500" : "text-slate-400"
        }`}
      >
        {length}/{COMMENT_MAX_LENGTH}
      </span>
    </div>
  );
}
