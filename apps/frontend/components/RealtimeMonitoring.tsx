"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RECONNECT_DELAY_MS = 5000;

// Connects to the backend's WebSocket so Monitoring picks up a truck
// location change the moment an operator saves it, instead of only on the
// next manual page load or navigation.
export function RealtimeMonitoring() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/ws-url", { cache: "no-store" });
        if (!res.ok) throw new Error("no ws url");
        const data = (await res.json()) as { wsUrl?: string };
        if (!data.wsUrl || cancelled) return;

        socket = new WebSocket(data.wsUrl);
        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string) as { type?: string };
            if (message.type === "truck-location-updated") router.refresh();
          } catch {
            // Ignore malformed messages.
          }
        };
        socket.onclose = () => {
          if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        };
        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [router]);

  return null;
}
