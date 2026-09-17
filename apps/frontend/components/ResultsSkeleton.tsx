export function ResultsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card h-[70px]" />
        <div className="card h-[70px]" />
      </div>
      <div className="h-64 rounded-2xl bg-white shadow-card" />
    </div>
  );
}
