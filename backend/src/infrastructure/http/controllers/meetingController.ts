// =============================================================================
// MeetingController
// Routes: /api/v1/meetings
// =============================================================================
import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate, requireAdmin, AuthenticatedRequest, getOrCreateDefaultOrg } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createMeetingUC,
  updateMeetingStatusUC,
  motionRepo,
  voteRepo,
  meetingRepo,
} from "../../../application/container";

const router = Router();

const CreateMeetingSchema = z.object({
  title: z.string().min(1).max(255),
  organizationId: z.string().uuid().optional(),
});

const UpdateStatusSchema = z.object({
  status:            z.enum(["LIVE", "CLOSED"]),
  transcriptSummary: z.string().optional(),
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

// GET /api/v1/meetings
router.get("/", authenticate, async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const meetings = await meetingRepo.findByOrganization(organizationId);
  res.json({ data: meetings });
});

// GET /api/v1/meetings/:id
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const meeting = await meetingRepo.findById(req.params.id, organizationId);
  if (!meeting) {
    res.status(404).json({ error: "NOT_FOUND", message: "Meeting not found." });
    return;
  }
  res.json({ data: meeting });
});

// GET /api/v1/meetings/:id/motions – with live tally
router.get("/:id/motions", authenticate, async (req: Request, res: Response) => {
  const motions = await motionRepo.findByMeeting(req.params.id);
  const withTally = await Promise.all(
    motions.map(async (m) => ({
      ...m,
      tally: await voteRepo.tallyByMotion(m.id),
    }))
  );
  res.json({ data: withTally });
});

// POST /api/v1/meetings
router.post("/", authenticate, requireAdmin, validate(CreateMeetingSchema), async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const meeting = await createMeetingUC.execute({ organizationId, title: req.body.title });
  res.status(201).json({ data: meeting });
});

// PATCH /api/v1/meetings/:id/status
router.patch("/:id/status", authenticate, requireAdmin, validate(UpdateStatusSchema), async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const meeting = await updateMeetingStatusUC.execute({
    meetingId:         req.params.id,
    organizationId,
    targetStatus:      req.body.status,
    transcriptSummary: req.body.transcriptSummary,
  });
  res.json({ data: meeting });
});

export default router;
