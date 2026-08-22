"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi, formToJson } from "./api";

export function useApiSubmit() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit<T = unknown>(
    path: string,
    options?: { method?: string; body?: unknown; redirectTo?: string; refresh?: boolean }
  ): Promise<T | null> {
    setPending(true);
    setError(null);
    try {
      const result = await clientApi<T>(path, {
        method: options?.method ?? "POST",
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
      if (options?.redirectTo) router.push(options.redirectTo);
      else if (options?.refresh !== false) router.refresh();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function submitForm<T = unknown>(
    event: React.FormEvent<HTMLFormElement>,
    path: string,
    options?: { method?: string; redirectTo?: string }
  ) {
    event.preventDefault();
    return submit<T>(path, {
      method: options?.method,
      body: formToJson(event.currentTarget),
      redirectTo: options?.redirectTo,
    });
  }

  return { submit, submitForm, pending, error, setError };
}
