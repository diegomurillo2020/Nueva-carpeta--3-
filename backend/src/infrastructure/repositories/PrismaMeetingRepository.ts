import { prisma } from "../database/prismaClient";
import { Meeting, MeetingStatus } from "../../domain/entities/Meeting";
import { IMeetingRepository, CreateMeetingInput } from "../../domain/repositories/IMeetingRepository";
import { NotFoundError } from "../../shared/errors/AppErrors";

function toEntity(raw: any): Meeting {
  return new Meeting({
    id: raw.id, organizationId: raw.organizationId, title: raw.title,
    status: raw.status as MeetingStatus,
    startTime: raw.startTime ?? undefined, endTime: raw.endTime ?? undefined,
    transcriptSummary: raw.transcriptSummary ?? undefined,
    createdAt: raw.createdAt, updatedAt: raw.updatedAt,
  });
}

export class PrismaMeetingRepository implements IMeetingRepository {
  async create(input: CreateMeetingInput): Promise<Meeting> {
    const raw = await prisma.meeting.create({ data: { organizationId: input.organizationId, title: input.title, status: "DRAFT" } });
    return toEntity(raw);
  }
  async findById(id: string, organizationId: string): Promise<Meeting | null> {
    const raw = await prisma.meeting.findFirst({ where: { id, organizationId } });
    return raw ? toEntity(raw) : null;
  }
  async findByOrganization(organizationId: string): Promise<Meeting[]> {
    const rows = await prisma.meeting.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
    return rows.map(toEntity);
  }
  async updateStatus(id: string, organizationId: string, status: MeetingStatus, extra?: { startTime?: Date; endTime?: Date; transcriptSummary?: string }): Promise<Meeting> {
    const updated = await prisma.meeting.updateMany({ where: { id, organizationId }, data: { status, ...extra } });
    if (updated.count === 0) throw new NotFoundError("Meeting", id);
    const raw = await prisma.meeting.findUniqueOrThrow({ where: { id } });
    return toEntity(raw);
  }
}