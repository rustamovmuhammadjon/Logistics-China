import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/errors.js";

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(503).json({
      error: "Database is unavailable. Check DATABASE_URL and that Postgres is reachable.",
    });
    return;
  }
  const message = err instanceof Error ? err.message : "Server error";
  const status = message.includes("required") ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: message });
}
