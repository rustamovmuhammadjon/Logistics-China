import { Router, type Request } from "express";
import { agentOwnerId, archiveAgent, createAgent, listAgents, updateAgent } from "../lib/agents.js";
import { asyncHandler } from "../middleware/errors.js";
import { type AuthedRequest } from "../middleware/auth.js";
import { broadcastOnMutation } from "../middleware/realtime.js";

// The agent directory: tracking companies and their operators (or a
// standalone operator). Attaching an agent to a sub-order lives on the
// operator router, next to the other sub-order routes.
export const agentsRouter = Router();

// An edit renames the agent everywhere it's attached, Monitoring included.
agentsRouter.use(broadcastOnMutation);

function scope(req: Request) {
  const user = (req as AuthedRequest).user;
  return { ownerId: agentOwnerId(user), label: user!.email };
}

agentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ agents: await listAgents(scope(req).ownerId) });
  })
);

agentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { ownerId, label } = scope(req);
    res.json({ agent: await createAgent(ownerId, req.body ?? {}, label) });
  })
);

agentsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ agent: await updateAgent(scope(req).ownerId, req.params.id, req.body ?? {}) });
  })
);

agentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await archiveAgent(scope(req).ownerId, req.params.id);
    res.json({ ok: true });
  })
);
