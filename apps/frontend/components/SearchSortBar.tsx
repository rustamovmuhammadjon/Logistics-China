import { Search } from "lucide-react";

export function SearchSortBar({ q, sort }: { q: string; sort: string }) {
  return (
    <form method="GET" className="card flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="field-label">Search</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field-input pl-9"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Order, sub-order, truck, trailer, or driver phone"
          />
        </div>
      </div>
      <div className="sm:w-56">
        <label className="field-label">Sort by</label>
        <select className="field-input" name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <button type="submit" className="btn-primary shrink-0">
        Apply
      </button>
    </form>
  );
}
