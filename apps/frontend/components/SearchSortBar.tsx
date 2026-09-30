"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Download, Search } from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;

export function SearchSortBar({
  q,
  sort,
  exportHref,
}: {
  q: string;
  sort: string;
  exportHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [qValue, setQValue] = useState(q);
  const [sortValue, setSortValue] = useState(sort);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stay in sync when the URL changes from elsewhere (back/forward nav).
  useEffect(() => setQValue(q), [q]);
  useEffect(() => setSortValue(sort), [sort]);

  function pushParams(nextQ: string, nextSort: string) {
    const params = new URLSearchParams();
    const trimmed = nextQ.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextSort) params.set("sort", nextSort);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  function handleQChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Search runs live as you type (debounced) — no need to press Apply.
    debounceRef.current = setTimeout(() => pushParams(value, sortValue), SEARCH_DEBOUNCE_MS);
  }

  function handleApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Apply only ever needed to pick up the sort choice — search is already
    // live — but it re-sends the current search text too so nothing is lost.
    pushParams(qValue, sortValue);
  }

  return (
    <form
      onSubmit={handleApply}
      className="-mx-4 flex flex-col gap-3 border-y border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="field-label text-[11px]">Search</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className="field-input py-1.5 pl-8 text-xs"
            type="text"
            name="q"
            value={qValue}
            onChange={handleQChange}
            placeholder="Order, sub-order, truck, trailer, or driver phone"
          />
        </div>
      </div>
      <div className="sm:w-48">
        <label className="field-label text-[11px]">Sort by</label>
        <select
          className="field-input py-1.5 text-xs"
          name="sort"
          value={sortValue}
          onChange={(e) => setSortValue(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <button type="submit" className="btn-primary shrink-0 px-3 py-1.5 text-xs">
        Apply
      </button>
      <a href={exportHref} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
        <Download className="h-3.5 w-3.5" />
        Download Excel
      </a>
    </form>
  );
}
