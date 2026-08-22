export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="h-4 w-72 rounded bg-slate-100" />
      <div className="h-36 rounded-2xl bg-white shadow-card" />
      <div className="h-36 rounded-2xl bg-white shadow-card" />
    </div>
  );
}
