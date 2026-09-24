"use client";

import { useEffect, useRef } from "react";

const RECONNECT_DELAY_MS = 5000;

// Opens (and keeps re-opening) a WebSocket to the backend's realtime feed,
// calling `onMessage` every time any change is broadcast — the message
// itself carries no data, it's just a "go refetch" signal. `onMessage` is
// read from a ref so the socket connects once per mount and isn't torn
// down and reopened just because the caller passed a new closure.
export function useRealtimeSync(onMessage: () => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

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
        socket.onmessage = () => handlerRef.current();
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
  }, []);
}
