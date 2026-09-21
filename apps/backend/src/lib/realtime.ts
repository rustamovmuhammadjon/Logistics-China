import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAdminSessionFromToken, verifyUserSessionFromToken } from "./auth.js";

const clients = new Set<WebSocket>();

// Attaches a WebSocket endpoint (at /ws) to the same HTTP server Express
// listens on, so live-tracking pages (Monitoring) can be pushed an update
// the moment an operator changes a truck's location, instead of only
// finding out on the next manual page refresh.
//
// A browser connects here directly (not through the Next.js proxy, which
// can't forward a WS upgrade) — its session cookie is scoped to the
// frontend's own domain, so it never reaches this origin. Instead, the
// frontend hands the browser its own session JWT (the same one that's
// normally the cookie's value) to present as ?token=, and it's verified
// exactly like the cookie is for ordinary HTTP requests.
export function attachRealtime(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://internal");
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get("token") ?? undefined;
    Promise.all([verifyAdminSessionFromToken(token), verifyUserSessionFromToken(token)])
      .then(([isAdmin, session]) => {
        if (!isAdmin && !session) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      })
      .catch(() => {
        socket.destroy();
      });
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });
}

// Every connected, authenticated client re-fetches Monitoring through the
// normal (already role-scoped) HTTP route when it gets this — the message
// itself carries no order data, so broadcasting to everyone is safe.
export function broadcastTruckLocationUpdate() {
  const message = JSON.stringify({ type: "truck-location-updated" });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}
