import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prismaClient";
import { authenticate, requireSuperadmin, AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../../shared/errors/AppErrors";

const router = Router();

// Protect ALL routes in this controller with authenticate + requireSuperadmin
router.use(authenticate);
router.use(requireSuperadmin);

// =============================================================================
// 1. GLOBAL DASHBOARD STATS
// =============================================================================
router.get("/stats", async (_req: Request, res: Response) => {
  const [totalOrgs, totalUsers, totalMeetings, totalVotes] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.meeting.count(),
    prisma.vote.count(),
  ]);

  const liveMeetings = await prisma.meeting.count({ where: { status: "LIVE" } });

  res.json({
    success: true,
    data: {
      totalOrganizations: totalOrgs,
      totalUsers,
      totalMeetings,
      liveMeetings,
      totalVotes,
    },
  });
});

// =============================================================================
// 2. ORGANIZATIONS (CONDOMINIUMS) CRUD
// =============================================================================

// List all organizations
router.get("/organizations", async (_req: Request, res: Response) => {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          properties: true,
          meetings: true,
        },
      },
      users: {
        where: { role: { name: "ORG_ADMIN" } },
        select: { id: true, fullName: true, email: true },
        take: 3,
      },
    },
  });

  res.json({ success: true, data: orgs });
});

// Get single organization
router.get("/organizations/:id", async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: {
      users: {
        include: { role: true },
        orderBy: { fullName: "asc" },
      },
      properties: true,
      meetings: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { motions: true } } },
      },
    },
  });

  if (!org) throw new NotFoundError("Organization", req.params.id);
  res.json({ success: true, data: org });
});

// Create new organization
router.post("/organizations", async (req: Request, res: Response) => {
  const { name, address, settings } = req.body;
  if (!name || typeof name !== "string") {
    throw new BadRequestError("El nombre del condominio/organización es obligatorio.");
  }

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      address: address ? address.trim() : null,
      settings: settings ?? { quorumRule: "COEFFICIENT", threshold: 51 },
    },
  });

  res.status(201).json({
    success: true,
    message: `Condominio "${org.name}" creado exitosamente.`,
    data: org,
  });
});

// Update organization
router.patch("/organizations/:id", async (req: Request, res: Response) => {
  const { name, address, settings, isActive } = req.body;

  const org = await prisma.organization.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name: name.trim() }),
      ...(address !== undefined && { address: address ? address.trim() : null }),
      ...(settings && { settings }),
      ...(typeof isActive === "boolean" && { isActive }),
    },
  });

  res.json({
    success: true,
    message: "Condominio actualizado exitosamente.",
    data: org,
  });
});

// Delete organization
router.delete("/organizations/:id", async (req: Request, res: Response) => {
  await prisma.organization.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: "Condominio eliminado del sistema.",
  });
});

// =============================================================================
// 3. ROLES & PERMISSIONS MANAGEMENT (RBAC ENGINE)
// =============================================================================

// List all roles with their assigned permissions
router.get("/roles", async (_req: Request, res: Response) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
  });

  res.json({ success: true, data: roles });
});

// List all system permissions
router.get("/permissions", async (_req: Request, res: Response) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });

  res.json({ success: true, data: permissions });
});

// Assign or update permissions for a role
router.post("/roles/:roleId/permissions", async (req: Request, res: Response) => {
  const { permissionIds } = req.body;
  if (!Array.isArray(permissionIds)) {
    throw new BadRequestError("permissionIds debe ser un array de IDs de permisos.");
  }

  const role = await prisma.role.findUnique({ where: { id: req.params.roleId } });
  if (!role) throw new NotFoundError("Role", req.params.roleId);

  // Clear existing role permissions and insert new ones
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((pid: string) => ({
        roleId: role.id,
        permissionId: pid,
      })),
    }),
  ]);

  const updatedRole = await prisma.role.findUnique({
    where: { id: role.id },
    include: { permissions: { include: { permission: true } } },
  });

  res.json({
    success: true,
    message: `Permisos del rol "${role.name}" actualizados.`,
    data: updatedRole,
  });
});

// =============================================================================
// 4. GLOBAL USERS DIRECTORY & ROLE ASSIGNMENT
// =============================================================================

const UserCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(255),
  email: z.string().trim().email().optional().or(z.literal("")),
  dniPassport: z.string().trim().max(100).optional().or(z.literal("")),
  phoneNumber: z.string().trim().max(50).optional().or(z.literal("")),
  roleId: z.string().uuid(),
  organizationId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const UserUpdateSchema = UserCreateSchema.partial();

function normalizeUserCreateInput(input: z.infer<typeof UserCreateSchema>): Prisma.UserUncheckedCreateInput {
  return {
    fullName: input.fullName,
    email: input.email || null,
    dniPassport: input.dniPassport || null,
    phoneNumber: input.phoneNumber || null,
    roleId: input.roleId,
    organizationId: input.organizationId ?? null,
    isActive: input.isActive ?? true,
  };
}

function normalizeUserUpdateInput(input: Partial<z.infer<typeof UserCreateSchema>>): Prisma.UserUncheckedUpdateInput {
  return {
    ...(input.fullName !== undefined && { fullName: input.fullName }),
    ...(input.email !== undefined && { email: input.email || null }),
    ...(input.dniPassport !== undefined && { dniPassport: input.dniPassport || null }),
    ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber || null }),
    ...(input.roleId !== undefined && { roleId: input.roleId }),
    ...(input.organizationId !== undefined && { organizationId: input.organizationId }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  };
}

// List all users globally
router.get("/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      role: true,
      organization: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: users });
});

// Get one user
router.get("/users/:id", async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { role: true, organization: { select: { id: true, name: true } } },
  });
  if (!user) throw new NotFoundError("User", req.params.id);
  res.json({ success: true, data: user });
});

// Create a global user/member
router.post("/users", async (req: Request, res: Response) => {
  const parsed = UserCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  try {
    const user = await prisma.user.create({
      data: normalizeUserCreateInput(parsed.data),
      include: { role: true, organization: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, message: `Usuario "${user.fullName}" creado exitosamente.`, data: user });
  } catch (error: any) {
    if (error?.code === "P2002") throw new ConflictError("El correo o documento ya está registrado.");
    throw error;
  }
});

// Update all editable user data
router.patch("/users/:id", async (req: Request, res: Response) => {
  const parsed = UserUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: normalizeUserUpdateInput(parsed.data),
      include: { role: true, organization: { select: { id: true, name: true } } },
    });

    res.json({ success: true, message: `Usuario "${user.fullName}" actualizado exitosamente.`, data: user });
  } catch (error: any) {
    if (error?.code === "P2025") throw new NotFoundError("User", req.params.id);
    if (error?.code === "P2002") throw new ConflictError("El correo o documento ya está registrado.");
    throw error;
  }
});

// Delete a user. The current superadmin cannot delete their own account.
router.delete("/users/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  if (auth.userId === req.params.id) {
    throw new ForbiddenError("No puedes eliminar tu propia cuenta de superadministrador.");
  }

  try {
    const user = await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: `Usuario "${user.fullName}" eliminado exitosamente.` });
  } catch (error: any) {
    if (error?.code === "P2025") throw new NotFoundError("User", req.params.id);
    throw error;
  }
});

export default router;
