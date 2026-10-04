import { Router, type Request } from "express";
import { optionalFloat, optionalString, requiredNumber } from "../lib/input.js";
import { conflict, notFound } from "../lib/errors.js";
import { recordDriverPing } from "../lib/assignments.js";
import { readBearerToken, verifyDriverToken } from "../lib/auth.js";
import {
  buildDriverMe,
  getDriverTrip,
  listDriverTrips,
  loadDriverContext,
  pairWithCode,
  registerDriver,
  signOutDriver,
  toDriverTrip,
  updateDriverProfile,
} from "../lib/drivers.js";
import { driverSend, driverThread, driverUnreadCount, listDriverChats } from "../lib/chat.js";
import { getDriverListing, saveDriverListing } from "../lib/fleet.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireDriver, type DriverRequest } from "../middleware/auth.js";
import { broadcastOnMutation, skipBroadcast } from "../middleware/realtime.js";

export const driverRouter = Router();

// A driver's phone pings its location here far more often than an operator
// edits anything by hand — this is the most important source of realtime
// updates, so every open Monitoring/order page picks it up live.
driverRouter.use(broadcastOnMutation);

const sessionOf = (req: Request) => (req as DriverRequest).driver;

// Profile and history belong to a registered driver. Not a 401: the token
// is still good (the app must not sign out), registration is just pending.
async function requireRegistered(req: Request) {
  const ctx = await loadDriverContext(sessionOf(req));
  if (!ctx.driver) conflict("Complete registration first");
  return { ...ctx, driver: ctx.driver };
}

// Open to anyone with a code. A registered driver who is already signed in
// sends their token along, so the new trip lands on their existing account.
driverRouter.post(
  "/pair",
  asyncHandler(async (req, res) => {
    const existing = await verifyDriverToken(readBearerToken(req));
    res.json(await pairWithCode(req.body?.code, existing));
  })
);

driverRouter.post(
  "/register",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    res.json(await registerDriver(sessionOf(req), req.body ?? {}));
  })
);

driverRouter.get(
  "/me",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    res.json({ me: buildDriverMe(await loadDriverContext(sessionOf(req))) });
  })
);

driverRouter.patch(
  "/profile",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    res.json({ profile: await updateDriverProfile(driver, req.body ?? {}) });
  })
);

driverRouter.get(
  "/trips",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    const trips = await listDriverTrips(driver.id);
    res.json({ trips: trips.map(toDriverTrip) });
  })
);

driverRouter.get(
  "/trips/:id",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    const id = optionalString(req.params.id);
    if (!id) notFound("Trip not found");
    res.json(await getDriverTrip(driver.id, id));
  })
);

driverRouter.get(
  "/chats",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    res.json({ chats: await listDriverChats(driver.id) });
  })
);

driverRouter.get(
  "/chats/unread-count",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    res.json({ count: await driverUnreadCount(driver.id) });
  })
);

driverRouter.get(
  "/chats/:operatorId/messages",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    res.json({ messages: await driverThread(driver.id, req.params.operatorId) });
  })
);

driverRouter.post(
  "/chats/:operatorId/messages",
  skipBroadcast,
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    res.json({ message: await driverSend(driver.id, req.params.operatorId, req.body?.text) });
  })
);

driverRouter.get(
  "/listing",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    res.json({ listing: await getDriverListing(driver.id) });
  })
);

driverRouter.put(
  "/listing",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { driver } = await requireRegistered(req);
    res.json({ listing: await saveDriverListing(driver.id, req.body ?? {}) });
  })
);

// "Sign out of this phone" — revokes the pairing server-side (so the web
// dashboard stops showing it as paired) and invalidates the driver's token.
driverRouter.post(
  "/unpair",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    await signOutDriver(sessionOf(req));
    res.json({ ok: true });
  })
);

// Pairing-only sessions (app builds from before registration) keep working.
driverRouter.post(
  "/location",
  asyncHandler(requireDriver),
  asyncHandler(async (req, res) => {
    const { assignment } = await loadDriverContext(sessionOf(req));
    if (!assignment) conflict("No active trip — enter a new code from your operator");
    const result = await recordDriverPing({
      assignmentId: assignment.id,
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
