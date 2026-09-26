import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { constantTimeEquals, processTrack718Payload, verifyTrack718Signature, type Track718Payload } from "../lib/track718.js";
import { asyncHandler } from "../middleware/errors.js";
import { broadcastUpdate } from "../lib/realtime.js";

export const track718WebhookRouter = Router();

// track718 pushes here whenever a subscribed number's track updates. No
// user auth — the URL's own token plus the payload's signature are the only
// gates. Per track718's webhook rules: a well-formed, correctly
// authenticated push must get 200 even for a number we don't recognize (a
// test push, for instance) — only a wrong token or bad signature is
// rejected before that.
track718WebhookRouter.post(
  "/:token",
  asyncHandler(async (req, res) => {
    const expectedToken = process.env.TRACK718_WEBHOOK_TOKEN || "";
    if (!expectedToken || !constantTimeEquals(req.params.token, expectedToken)) {
      res.status(404).end();
      return;
    }

    const payload = req.body as Track718Payload;
    const accountEmail = process.env.TRACK718_ACCOUNT_EMAIL || "";
    if (!verifyTrack718Signature(payload?.verify, accountEmail)) {
      res.status(401).end();
      return;
    }

    let inbox;
    try {
      inbox = await prisma.track718WebhookInbox.create({ data: { payload: payload as object } });
    } catch (err) {
      console.error("track718 webhook: failed to store inbox row, asking for a retry", err);
      res.status(500).end();
      return;
    }

    // The raw body is safely stored — from here on we always answer 200
    // (Callback = Yes on track718's side means anything else triggers a
    // retry) and keep processing errors to ourselves via the inbox row.
    res.status(200).json({ ok: true });

    try {
      await processTrack718Payload(payload);
      await prisma.track718WebhookInbox.update({ where: { id: inbox.id }, data: { processedAt: new Date() } });
      broadcastUpdate();
    } catch (err) {
      console.error("track718 webhook: processing failed", err);
      await prisma.track718WebhookInbox.update({
        where: { id: inbox.id },
        data: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  })
);
