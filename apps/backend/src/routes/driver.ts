import { Router } from "express";
import { optionalFloat, optionalString, requiredNumber } from "../lib/input.js";
import { loadActiveDriver, pairDriver, recordDriverPing, toDriverMe } from "../lib/assignments.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireDriver, type DriverRequest } from "../middleware/auth.js";

export const driverRouter = Router();

driverRouter.post(
  "/pair",
  asyncHandler(async (req, res) => {
    const { token, assignment } = await pairDriver(req.body?.phone, req.body?.code);
    res.json({ token, driver: toDriverMe(assignment) });
  })
);

driverRouter.get(
  "/me",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const session = (req as DriverRequest).driver;
    const assignment = await loadActiveDriver(session.assignmentId, session.tokenVersion);
    res.json({ driver: toDriverMe(assignment) });
  })
);

driverRouter.post(
  "/location",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const session = (req as DriverRequest).driver;
    await loadActiveDriver(session.assignmentId, session.tokenVersion);
    const result = await recordDriverPing({
      assignmentId: session.assignmentId,
      lat: requiredNumber(req.body?.lat, "lat"),
      lng: requiredNumber(req.body?.lng, "lng"),
      accuracy: optionalFloat(req.body?.accuracy),
      locationText: optionalString(req.body?.locationText),
    });
    res.json({
      ok: true,
      lastPingAt: result.lastPingAt,
      lastLocationText: result.lastLocationText,
    });
  })
);
