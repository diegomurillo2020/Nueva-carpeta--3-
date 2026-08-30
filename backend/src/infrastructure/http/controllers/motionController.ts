// =============================================================================
// MotionController
// Routes: /api/v1/motions
// =============================================================================
import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate, requireAdmin, AuthenticatedRequest, getOrCreateDefaultOrg } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { openMotionUC, closeMotionUC } from "../../../application/container";

const router = Router();

const OpenMotionSchema = z.object({
  meetingId:        z.string().uuid(),
  title:            z.string().min(1).max(255),
  description:      z.string().optional(),
  options:          z.array(z.enum(["YES", "NO", "ABSTAIN"])).optional(),
  durationSeconds:  z.number().int().positive().optional(),
  orderIndex:       z.number().int().min(0).optional(),
  organizationId:   z.string().uuid().optional(),
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

// POST /api/v1/motions  – open a new motion on a LIVE meeting
router.post("/", authenticate, requireAdmin, validate(OpenMotionSchema), async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const motion = await openMotionUC.execute({ ...req.body, organizationId });
  res.status(201).json({ data: motion });
});

// POST /api/v1/motions/:id/close
router.post("/:id/close", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const result = await closeMotionUC.execute({
    motionId:       req.params.id,
    organizationId,
  });
  res.json({ data: result });
});

export default router;
