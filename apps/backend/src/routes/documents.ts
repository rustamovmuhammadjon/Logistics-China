import { Router } from "express";
import { documentDownloadUrl } from "../lib/documents.js";
import { orderVisibilityWhere } from "../lib/orders.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireAnyAuth, type AuthedRequest } from "../middleware/auth.js";

export const documentsRouter = Router();

documentsRouter.use(requireAnyAuth);

// One download route for every role: a document is downloadable by exactly
// the people who can already see its truck (same visibility as Monitoring).
// Returns a short-lived signed link rather than streaming the file, since a
// 15 MB response would exceed Vercel's proxy limit.
documentsRouter.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    const visibility = await orderVisibilityWhere({ isAdmin, user });
    res.json({ url: await documentDownloadUrl(req.params.id, visibility) });
  })
);
