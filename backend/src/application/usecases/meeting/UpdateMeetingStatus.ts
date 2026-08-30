import { Meeting, MeetingStatus } from "../../../domain/entities/Meeting";
import { IMeetingRepository } from "../../../domain/repositories/IMeetingRepository";
import { IMotionRepository } from "../../../domain/repositories/IMotionRepository";
import { NotFoundError, UnprocessableError } from "../../../shared/errors/AppErrors";
import { NotificationService } from "../../services/NotificationService";

export interface UpdateMeetingStatusDTO {
  meetingId:         string;
  organizationId:    string;
  targetStatus:      MeetingStatus;
  transcriptSummary?: string;
}

export class UpdateMeetingStatusUseCase {
  constructor(
    private readonly meetingRepo: IMeetingRepository,
    private readonly motionRepo:  IMotionRepository
  ) {}

  async execute(dto: UpdateMeetingStatusDTO): Promise<Meeting> {
    const meeting = await this.meetingRepo.findById(dto.meetingId, dto.organizationId);
    if (!meeting) throw new NotFoundError("Meeting", dto.meetingId);

    if (!meeting.canTransitionTo(dto.targetStatus)) {
      throw new UnprocessableError(
        `Cannot transition meeting from '${meeting.status}' to '${dto.targetStatus}'.`
      );
    }

    const extra: { startTime?: Date; endTime?: Date; transcriptSummary?: string } = {};

    if (dto.targetStatus === "LIVE") {
      extra.startTime = new Date();
    }

    if (dto.targetStatus === "CLOSED") {
      extra.endTime = new Date();
      const motions = await this.motionRepo.findByMeeting(dto.meetingId);
      for (const motion of motions.filter((m) => m.isOpen())) {
        await this.motionRepo.updateStatus(motion.id, "CLOSED", { closedAt: new Date() });
      }
      if (dto.transcriptSummary) extra.transcriptSummary = dto.transcriptSummary;
    }

    const updatedMeeting = await this.meetingRepo.updateStatus(dto.meetingId, dto.organizationId, dto.targetStatus, extra);

    if (dto.targetStatus === "CLOSED") {
      await NotificationService.notifyOrganization(
        dto.organizationId,
        "Acta de reunión disponible",
        `El acta y resumen de la reunión "${meeting.title}" ya están disponibles.`,
        "MINUTES_READY",
        meeting.id
      );
    }

    return updatedMeeting;
  }
}
