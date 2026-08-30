import { prisma } from "../database/prismaClient";
import { Motion, MotionStatus, VoteChoice } from "../../domain/entities/Motion";
import { IMotionRepository, CreateMotionInput } from "../../domain/repositories/IMotionRepository";

function toEntity(raw: any): Motion {
  return new Motion({
    id: raw.id, meetingId: raw.meetingId, title: raw.title,
    description: raw.description ?? undefined,
    options: raw.options as VoteChoice[], status: raw.status as MotionStatus,
    durationSeconds: raw.durationSeconds ?? undefined,
    openedAt: raw.openedAt ?? undefined, closedAt: raw.closedAt ?? undefined,
    orderIndex: raw.orderIndex ?? 0, createdAt: raw.createdAt,
  });
}

export class PrismaMotionRepository implements IMotionRepository {
  async create(input: CreateMotionInput): Promise<Motion> {
    const raw = await prisma.motion.create({
      data: { meetingId: input.meetingId, title: input.title, description: input.description, options: input.options ?? ["YES","NO","ABSTAIN"], durationSeconds: input.durationSeconds, orderIndex: input.orderIndex ?? 0, status: "OPEN" },
    });
    return toEntity(raw);
  }
  async findById(id: string): Promise<Motion | null> {
    const raw = await prisma.motion.findUnique({ where: { id } });
    return raw ? toEntity(raw) : null;
  }
  async findByMeeting(meetingId: string): Promise<Motion[]> {
    const rows = await prisma.motion.findMany({ where: { meetingId }, orderBy: { orderIndex: "asc" } });
    return rows.map(toEntity);
  }
  async updateStatus(id: string, status: MotionStatus, extra?: { openedAt?: Date; closedAt?: Date }): Promise<Motion> {
    const raw = await prisma.motion.update({ where: { id }, data: { status, ...extra } });
    return toEntity(raw);
  }
}