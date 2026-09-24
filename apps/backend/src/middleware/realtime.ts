import type { NextFunction, Request, Response } from "express";
import { broadcastUpdate } from "../lib/realtime.js";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Mount with `router.use(broadcastOnMutation)` on any router whose writes
// should make every open page refetch live — it fires broadcastUpdate()
// after any successful (non-GET, < 400) request on that router, so a new
// mutating route gets realtime behavior for free without being wired up
// by hand. Keep this off routers whose writes are personal-only and not
// meaningful to other viewers (auth, profile) — broadcasting those would
// just refresh every other connected client's page for no visible reason.
export function broadcastOnMutation(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }
  res.on("finish", () => {
    if (res.statusCode < 400) broadcastUpdate();
  });
  next();
}
