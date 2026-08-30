import { prisma } from "../database/prismaClient";
import { Member, UserRole } from "../../domain/entities/Member";
import { IMemberRepository, CreateMemberInput } from "../../domain/repositories/IMemberRepository";
import { NotFoundError } from "../../shared/errors/AppErrors";

function toEntity(raw: any): Member {
  const roleName = (typeof raw.role === "string" ? raw.role : raw.role?.name) ?? "MEMBER";
  return new Member({
    id: raw.id,
    organizationId: raw.organizationId,
    dniPassport: raw.dniPassport ?? undefined,
    fullName: raw.fullName,
    email: raw.email ?? undefined,
    phoneNumber: raw.phoneNumber ?? undefined,
    role: roleName as UserRole,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
  });
}

export class PrismaMemberRepository implements IMemberRepository {
  private async getRoleId(name: string): Promise<string> {
    let role = await prisma.role.findUnique({ where: { name } });
    if (!role) {
      role = await prisma.role.create({
        data: { name, description: `System role: ${name}` },
      });
    }
    return role.id;
  }

  async create(input: CreateMemberInput): Promise<Member> {
    const roleId = await this.getRoleId(input.role ?? "MEMBER");
    const raw = await prisma.user.create({
      data: {
        organizationId: input.organizationId,
        roleId,
        fullName: input.fullName,
        dniPassport: input.dniPassport,
        email: input.email,
        phoneNumber: input.phoneNumber,
      },
      include: { role: true },
    });
    return toEntity(raw);
  }

  async findById(id: string, organizationId: string): Promise<Member | null> {
    const raw = await prisma.user.findFirst({
      where: { id, organizationId },
      include: { role: true },
    });
    return raw ? toEntity(raw) : null;
  }

  async findByPhone(phoneNumber: string, organizationId: string): Promise<Member | null> {
    const raw = await prisma.user.findFirst({
      where: { phoneNumber, organizationId },
      include: { role: true },
    });
    return raw ? toEntity(raw) : null;
  }

  async findByOrganization(organizationId: string): Promise<Member[]> {
    const rows = await prisma.user.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { fullName: "asc" },
    });
    return rows.map(toEntity);
  }

  async setActive(id: string, organizationId: string, isActive: boolean): Promise<Member> {
    const updated = await prisma.user.updateMany({
      where: { id, organizationId },
      data: { isActive },
    });
    if (updated.count === 0) throw new NotFoundError("Member", id);
    const raw = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: { role: true },
    });
    return toEntity(raw);
  }
}