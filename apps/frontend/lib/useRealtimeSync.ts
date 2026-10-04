"use client";

import { useEffect, useRef } from "react";

const RECONNECT_DELAY_MS = 5000;

// "data-updated" is the shared "go refetch" signal; anything else (e.g.
// "chat") is a personal event addressed to this user only.
export type RealtimeEvent = { type: string } & Record<string, unknown>;

// Opens (and keeps re-opening) a WebSocket to the backend's realtime feed,
// calling `onMessage` for every event it pushes. `onMessage` is read from a
// ref so the socket connects once per mount and isn't torn down and
// reopened just because the caller passed a new closure.
export function useRealtimeSync(onMessage: (event: RealtimeEvent) => void) {
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
        socket.onmessage = (message) => {
          let event: RealtimeEvent = { type: "data-updated" };
          try {
            event = JSON.parse(String(message.data)) as RealtimeEvent;
          } catch {
            // an unparseable frame still means "something changed"
          }
          handlerRef.current(event);
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
  }, []);
}
