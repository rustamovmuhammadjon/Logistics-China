export function ProfileSkeleton() {
  return (
    <div className="card animate-pulse space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-5 w-24 rounded bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-100" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-10 rounded-lg bg-slate-100" />
        <div className="h-10 rounded-lg bg-slate-100" />
        <div className="h-10 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
