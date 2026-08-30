// =============================================================================
// NotificationController
// Routes: /api/v1/notifications
// =============================================================================
import { Router, Request, Response } from "express";
import { authenticate, AuthenticatedRequest, getOrCreateDefaultOrg } from "../middleware/auth";
import { prisma } from "../../database/prismaClient";
import { NotFoundError } from "../../../shared/errors/AppErrors";

const router = Router();

async function resolveOrgId(req: Request): Promise<string> {
  const auth = (req as AuthenticatedRequest).auth;
  return (
    (req.query?.orgId as string) ||
    auth.organizationId ||
    (await getOrCreateDefaultOrg())
  );
}

// GET /api/v1/notifications - List user notifications
router.get("/", authenticate, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const organizationId = await resolveOrgId(req);

  const notifications = await prisma.notification.findMany({
    where: {
      userId: auth.userId,
      organizationId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId: auth.userId,
      organizationId,
      isRead: false,
    },
  });

  res.json({
    success: true,
    data: notifications,
    meta: { unreadCount },
  });
});

// PATCH /api/v1/notifications/:id/read - Mark single as read
router.patch("/:id/read", authenticate, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;

  const notification = await prisma.notification.findFirst({
    where: {
      id: req.params.id,
      userId: auth.userId,
    },
  });

  if (!notification) throw new NotFoundError("Notification", req.params.id);

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
  });

  res.json({
    success: true,
    data: updated,
  });
});

// POST /api/v1/notifications/read-all - Mark all as read
router.post("/read-all", authenticate, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const organizationId = await resolveOrgId(req);

  await prisma.notification.updateMany({
    where: {
      userId: auth.userId,
      organizationId,
      isRead: false,
    },
    data: { isRead: true },
  });

  res.json({
    success: true,
    message: "Todas las notificaciones marcadas como leídas.",
  });
});

export default router;
