"use client";

import { useRouter } from "next/navigation";
import { useRealtimeSync } from "@/lib/useRealtimeSync";

// Mounted once, at the shell level, so every page — not just Monitoring —
// picks up a change (an order, sub-order, truck, comment, employee/operator,
// link, partner, driver ping, ...) the moment it happens, instead of only on
// the next manual reload or navigation.
export function RealtimeSync() {
  const router = useRouter();
  useRealtimeSync(() => router.refresh());
  return null;
}
