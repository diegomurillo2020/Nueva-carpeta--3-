// =============================================================================
// MemberController
// Routes: /api/v1/members
// Auto-provisions Supabase Auth credentials with temporary passwords
// =============================================================================
import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate, requireAdmin, AuthenticatedRequest, getOrCreateDefaultOrg } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../../database/prismaClient";
import { supabaseAdmin } from "../../auth/supabaseAdmin";
import { BadRequestError, NotFoundError } from "../../../shared/errors/AppErrors";

const router = Router();

const CreateMemberSchema = z.object({
  fullName:         z.string().min(1, "El nombre completo es requerido"),
  dniPassport:      z.string().optional(),
  email:            z.string().email("Formato de correo inválido"),
  phoneNumber:      z.string().optional(),
  role:             z.enum(["ORG_ADMIN", "SECRETARY", "MEMBER"]).default("MEMBER"),
  temporaryPassword: z.string().min(6).optional(),
  unitIdentifier:   z.string().optional(), // e.g. "Apto 4B"
  coefficientShare: z.number().min(0).max(100).optional(), // e.g. 2.5
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

// GET /api/v1/members – List all members in the scoped organization
router.get("/", authenticate, async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);

  const members = await prisma.user.findMany({
    where: { organizationId },
    include: {
      role: true,
      properties: true,
    },
    orderBy: { fullName: "asc" },
  });

  res.json({ success: true, data: members });
});

// POST /api/v1/members – Auto-register member with Supabase Auth credentials
router.post("/", authenticate, requireAdmin, validate(CreateMemberSchema), async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const {
    fullName,
    dniPassport,
    email,
    phoneNumber,
    role: roleName,
    temporaryPassword,
    unitIdentifier,
    coefficientShare,
  } = req.body;

  // 1. Generate default password if not provided
  const generatedPassword = temporaryPassword || `ConvoPass${Math.floor(1000 + Math.random() * 9000)}!`;

  // 2. Resolve Role ID
  let role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    role = await prisma.role.create({
      data: { name: roleName, description: `Rol ${roleName}` },
    });
  }

  // 3. Check if user already exists in PostgreSQL
  const existingDbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        ...(dniPassport ? [{ dniPassport, organizationId }] : []),
      ],
    },
  });

  let userId: string;

  if (existingDbUser) {
    // If existing in same org, return error
    if (existingDbUser.organizationId === organizationId) {
      throw new BadRequestError(`Ya existe un miembro registrado con el correo "${email}" en este condominio.`);
    }
    userId = existingDbUser.id;
  } else {
    // 4. Provision in Supabase Auth via Admin API
    let supabaseUid: string | undefined;

    try {
      const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: generatedPassword,
        email_confirm: true, // Auto-confirm email so they can log in immediately
        user_metadata: {
          full_name: fullName.trim(),
          phone_number: phoneNumber,
          organization_id: organizationId,
        },
      });

      if (sbError) {
        // If already exists in Supabase Auth, lookup UID
        if (sbError.message.includes("already registered") || sbError.message.includes("unique constraint")) {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const found = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          supabaseUid = found?.id;
        } else {
          console.warn("[MemberController] Supabase Auth creation note:", sbError.message);
        }
      } else {
        supabaseUid = sbData.user.id;
      }
    } catch (sbErr) {
      console.warn("[MemberController] Supabase Admin API exception:", sbErr);
    }

    // 5. Create user record in PostgreSQL
    const newDbUser = await prisma.user.create({
      data: {
        ...(supabaseUid ? { id: supabaseUid } : {}),
        organizationId,
        roleId: role.id,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        dniPassport: dniPassport?.trim() || null,
        phoneNumber: phoneNumber?.trim() || null,
        isActive: true,
      },
      include: { role: true },
    });

    userId = newDbUser.id;
  }

  // 6. Optional: Create property assignment if unit identifier is given
  if (unitIdentifier) {
    await prisma.property.create({
      data: {
        organizationId,
        ownerId: userId,
        unitIdentifier: unitIdentifier.trim(),
        coefficientShare: coefficientShare ? (coefficientShare / 100) : 0.01,
      },
    });
  }

  const completeUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, properties: true, organization: true },
  });

  res.status(201).json({
    success: true,
    message: `Miembro "${fullName}" registrado exitosamente en el condominio.`,
    data: completeUser,
    credentials: {
      email: email.toLowerCase(),
      temporaryPassword: generatedPassword,
      loginUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`,
      instructions: "El usuario puede ingresar inmediatamente con estas credenciales y cambiar su contraseña.",
    },
  });
});

// PATCH /api/v1/members/:id/toggle-status
router.patch("/:id/toggle-status", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, organizationId },
  });

  if (!user) throw new NotFoundError("Member", req.params.id);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: !user.isActive },
    include: { role: true },
  });

  res.json({
    success: true,
    message: `Estado del miembro cambiado a ${updated.isActive ? "Activo" : "Inactivo"}.`,
    data: updated,
  });
});

// POST /api/v1/members/:id/reset-password – Reset temporary password for a member
router.post("/:id/reset-password", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const organizationId = await resolveOrgId(req);
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, organizationId },
  });

  if (!user || !user.email) throw new NotFoundError("Member with email", req.params.id);

  const newTempPassword = `ConvoPass${Math.floor(1000 + Math.random() * 9000)}!`;

  try {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newTempPassword,
    });
  } catch (err: any) {
    console.warn("[MemberController] Supabase password reset notice:", err?.message);
  }

  res.json({
    success: true,
    message: `Contraseña temporal regenerada para ${user.fullName}.`,
    credentials: {
      email: user.email,
      temporaryPassword: newTempPassword,
    },
  });
});

export default router;
