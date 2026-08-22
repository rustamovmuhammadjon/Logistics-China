import { cookies } from "next/headers";
import { ApiError } from "./api";

const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";

async function parseError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function serverApi<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const headers = new Headers(init?.headers);
  headers.set("cookie", cookieStore.toString());
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }

  return (await res.json()) as T;
}

export async function serverApiOrNull<T>(path: string): Promise<T | null> {
  try {
    return await serverApi<T>(path);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) return null;
    throw err;
  }
}

export async function serverApiSafe<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  try {
    return { data: await serverApi<T>(path), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Request failed" };
  }
}
