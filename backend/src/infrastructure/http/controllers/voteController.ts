// =============================================================================
// VoteController
// Routes: /api/v1/votes
// =============================================================================
import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate, AuthenticatedRequest, getOrCreateDefaultOrg } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { castVoteUC, voteRepo } from "../../../application/container";

const router = Router();

const CastVoteSchema = z.object({
  motionId:       z.string().uuid(),
  choice:         z.enum(["YES", "NO", "ABSTAIN"]),
  source:         z.enum(["WEB", "WHATSAPP", "TELEGRAM"]).optional(),
  organizationId: z.string().uuid().optional(),
});

async function resolveOrgId(req: Request): Promise<string> {
  const auth = (req as AuthenticatedRequest).auth;
  return (
    (req.body?.organizationId as string) ||
    (req.query?.orgId as string) ||
    auth.organizationId ||
    (await getOrCreateDefaultOrg())
  );
}

// POST /api/v1/votes  – cast a vote (member casts their own)
router.post("/", authenticate, validate(CastVoteSchema), async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).auth;
  const organizationId = await resolveOrgId(req);
  const vote = await castVoteUC.execute({
    motionId:       req.body.motionId,
    userId,
    organizationId,
    choice:         req.body.choice,
    source:         req.body.source ?? "WEB",
  });
  res.status(201).json({ data: vote });
});

// GET /api/v1/votes/motion/:motionId  – real-time tally for a motion
router.get("/motion/:motionId", authenticate, async (req: Request, res: Response) => {
  const tally = await voteRepo.tallyByMotion(req.params.motionId);
  res.json({ data: tally });
});

export default router;
