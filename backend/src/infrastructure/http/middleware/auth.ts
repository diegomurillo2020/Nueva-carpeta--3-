import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { ForbiddenError } from "../../../shared/errors/AppErrors";
import { prisma } from "../../database/prismaClient";

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    organizationId?: string | null;
    role: string; // SUPERADMIN | ORG_ADMIN | SECRETARY | MEMBER
    email?: string;
  };
}

const supabaseUrl = process.env.SUPABASE_URL || "https://wrerlobbajyabhljfqgo.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Ensures global roles exist and returns role ID by name
 */
export async function getRoleId(name: string): Promise<string> {
  let role = await prisma.role.findUnique({ where: { name } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        name,
        description: `System role: ${name}`,
      },
    });
  }
  return role.id;
}

/**
 * Ensures a default organization exists in the database.
 */
export async function getOrCreateDefaultOrg(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (org) return org.id;

  const newOrg = await prisma.organization.create({
    data: {
      name: "Condominio Torre Bella Vista",
      address: "Av. Winston Churchill #45, Santo Domingo",
      settings: { quorumRule: "COEFFICIENT", threshold: 51 },
    },
  });
  return newOrg.id;
}

/**
 * Authenticates requests using real Supabase JWT access tokens
 * or development mode token fallback.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ForbiddenError("Missing or malformed Authorization header. Expected 'Bearer <token>'.");
  }

  const token = header.slice(7).trim();

  // 1. Development fallback token
  if (process.env.NODE_ENV === "development" && (token === "dev-token" || token === "test-token")) {
    const superadminRoleId = await getRoleId("SUPERADMIN");
    let devUser = await prisma.user.findFirst({
      where: { email: "diegodanielalejomurillo@gmail.com" },
      include: { role: true },
    });

    if (!devUser) {
      devUser = await prisma.user.create({
        data: {
          fullName: "Diego Alejo Murillo (Superadmin)",
          email: "diegodanielalejomurillo@gmail.com",
          roleId: superadminRoleId,
          organizationId: null,
          isActive: true,
        },
        include: { role: true },
      });
    }

    (req as AuthenticatedRequest).auth = {
      userId: devUser.id,
      organizationId: devUser.organizationId,
      role: devUser.role?.name || "SUPERADMIN",
      email: devUser.email ?? undefined,
    };
    return next();
  }

  // 2. Real Supabase Auth verification
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      console.warn("[Auth] Supabase token verification failed:", error?.message);
      throw new ForbiddenError("Invalid or expired Supabase token. Please log in again.");
    }

    const sbUser = data.user;
    const email = sbUser.email ?? "";
    const isSuperadminEmail = email.toLowerCase() === "diegodanielalejomurillo@gmail.com";

    // Ensure member record exists in PostgreSQL users table
    let dbUser = await prisma.user.findUnique({
      where: { id: sbUser.id },
      include: { role: true },
    });

    if (!dbUser) {
      const superadminRoleId = await getRoleId("SUPERADMIN");
      const orgAdminRoleId = await getRoleId("ORG_ADMIN");
      const defaultOrgId = isSuperadminEmail ? null : await getOrCreateDefaultOrg();

      const fullName = (sbUser.user_metadata?.full_name as string) || (email ? email.split("@")[0] : "Usuario Supabase");

      dbUser = await prisma.user.create({
        data: {
          id: sbUser.id,
          organizationId: defaultOrgId,
          roleId: isSuperadminEmail ? superadminRoleId : orgAdminRoleId,
          fullName,
          email: email || undefined,
          isActive: true,
        },
        include: { role: true },
      });
      console.log(`[Auth] Provisioned user ${sbUser.id} (${email}) with role ${dbUser.role.name}.`);
    }

    (req as AuthenticatedRequest).auth = {
      userId: dbUser.id,
      organizationId: dbUser.organizationId,
      role: dbUser.role.name,
      email: dbUser.email ?? undefined,
    };

    next();
  } catch (err: any) {
    if (err instanceof ForbiddenError) throw err;
    console.error("[Auth] Unexpected error during authentication:", err);
    throw new ForbiddenError("Authentication failed.");
  }
}

/**
 * Restricts endpoint exclusively to Global Superadmin users
 */
export function requireSuperadmin(req: Request, _res: Response, next: NextFunction): void {
  const auth = (req as AuthenticatedRequest).auth;
  const isSuper = auth.role === "SUPERADMIN" || auth.email?.toLowerCase() === "diegodanielalejomurillo@gmail.com";
  if (!isSuper) {
    throw new ForbiddenError("Acceso denegado: Se requieren privilegios de Superadministrador Global.");
  }
  next();
}

/**
 * Restricts endpoint to Organization Administrators or Superadmin
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const auth = (req as AuthenticatedRequest).auth;
  const isAllowed = auth.role === "SUPERADMIN" || auth.role === "ORG_ADMIN";
  if (!isAllowed) {
    throw new ForbiddenError("Acceso denegado: Se requiere rol de Administrador para esta operación.");
  }
  next();
}