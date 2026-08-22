"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md space-y-3 text-center">
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500">{error.message || "Please try again."}</p>
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
