import { Router } from "express";
import { listOperatorChats, operatorSend, operatorThread, operatorUnreadCount } from "../lib/chat.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireOperator, type AuthedRequest } from "../middleware/auth.js";

// The operator's side of driver chat. No broadcastOnMutation here: a message
// concerns one driver and one operator, never every open page.
export const chatsRouter = Router();

chatsRouter.use(requireOperator);

chatsRouter.get(
  "/drivers",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    res.json({ chats: await listOperatorChats(me.id) });
  })
);

chatsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    res.json({ count: await operatorUnreadCount(me.id) });
  })
);

chatsRouter.get(
  "/drivers/:driverId/messages",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    res.json({ messages: await operatorThread(me.id, req.params.driverId) });
  })
);

chatsRouter.post(
  "/drivers/:driverId/messages",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    res.json({ message: await operatorSend(me.id, req.params.driverId, req.body?.text) });
  })
);
