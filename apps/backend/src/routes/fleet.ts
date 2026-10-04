import { Router, type Request } from "express";
import {
  addGlobalDriver,
  createFleetDriver,
  fleetCompanyId,
  listGlobalDrivers,
  listMyDrivers,
  removeFleetDriver,
  updateFleetDriver,
} from "../lib/fleet.js";
import { asyncHandler } from "../middleware/errors.js";
import { type AuthedRequest } from "../middleware/auth.js";
import { broadcastOnMutation } from "../middleware/realtime.js";

// Tracking companies and their operators only: browse published truck ads
// ("Global drivers") and keep the company's own roster ("My drivers").
export const fleetRouter = Router();

fleetRouter.use(broadcastOnMutation);

function scope(req: Request) {
  const user = (req as AuthedRequest).user;
  const companyId = fleetCompanyId(user);
  return { companyId, label: user!.email };
}

fleetRouter.get(
  "/global",
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);
    res.json({ drivers: await listGlobalDrivers(companyId) });
  })
);

fleetRouter.get(
  "/my",
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);
    res.json(await listMyDrivers(companyId));
  })
);

fleetRouter.post(
  "/my",
  asyncHandler(async (req, res) => {
    const { companyId, label } = scope(req);
    await addGlobalDriver(companyId, req.body?.driverId, label);
    res.json({ ok: true });
  })
);

fleetRouter.post(
  "/my/manual",
  asyncHandler(async (req, res) => {
    const { companyId, label } = scope(req);
    res.json(await createFleetDriver(companyId, req.body ?? {}, label));
  })
);

fleetRouter.patch(
  "/my/:driverId",
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);
    await updateFleetDriver(companyId, req.params.driverId, req.body ?? {});
    res.json({ ok: true });
  })
);

fleetRouter.delete(
  "/my/:driverId",
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);
    await removeFleetDriver(companyId, req.params.driverId);
    res.json({ ok: true });
  })
);
