import { Router, Request, Response } from "express";
import { prisma } from "../../database/prismaClient";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get("/me", authenticate, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const requestedOrgId = (req.query.orgId as string) || auth.organizationId;

  if (!requestedOrgId) {
    // For global superadmins without specific org assigned, return the first active org
    const defaultOrg = await prisma.organization.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    return res.json({ data: defaultOrg });
  }

  const org = await prisma.organization.findFirst({ where: { id: requestedOrgId, isActive: true } });
  return res.json({ data: org });
});

export default router;
