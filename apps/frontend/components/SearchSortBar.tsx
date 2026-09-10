import { Download, Search } from "lucide-react";

export function SearchSortBar({
  q,
  sort,
  exportHref,
}: {
  q: string;
  sort: string;
  exportHref: string;
}) {
  return (
    <form
      method="GET"
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
            defaultValue={q}
            placeholder="Order, sub-order, truck, trailer, or driver phone"
          />
        </div>
      </div>
      <div className="sm:w-48">
        <label className="field-label text-[11px]">Sort by</label>
        <select className="field-input py-1.5 text-xs" name="sort" defaultValue={sort}>
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
