export function DbError({ message }: { message: string }) {
  return (
    <div className="card border-amber-200 bg-amber-50">
      <h2 className="font-semibold text-amber-950">Can’t load orders right now</h2>
      <p className="mt-1 text-sm text-amber-800">{message}</p>
      <p className="mt-2 text-sm text-amber-800">
        Check that Postgres is reachable (`DATABASE_URL` in `apps/backend/.env`) and that the backend is running on
        port 4000.
      </p>
    </div>
  );
}
