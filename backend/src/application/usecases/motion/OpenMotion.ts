import { Motion } from "../../../domain/entities/Motion";
import { VoteChoice } from "../../../domain/entities/Motion";
import { IMotionRepository } from "../../../domain/repositories/IMotionRepository";
import { IMeetingRepository } from "../../../domain/repositories/IMeetingRepository";
import { NotFoundError, UnprocessableError } from "../../../shared/errors/AppErrors";
import { NotificationService } from "../../services/NotificationService";

export interface CreateMotionDTO {
  meetingId:        string;
  organizationId:   string;
  title:            string;
  description?:     string;
  options?:         VoteChoice[];
  durationSeconds?: number;
  orderIndex?:      number;
}

export class OpenMotionUseCase {
  constructor(
    private readonly motionRepo:  IMotionRepository,
    private readonly meetingRepo: IMeetingRepository
  ) {}

  async execute(dto: CreateMotionDTO): Promise<Motion> {
    const meeting = await this.meetingRepo.findById(dto.meetingId, dto.organizationId);
    if (!meeting) throw new NotFoundError("Meeting", dto.meetingId);

    if (meeting.isClosed()) {
      throw new UnprocessableError(
        `Cannot create a motion on a meeting with status '${meeting.status}'.`
      );
    }

    const motion = await this.motionRepo.create({
      meetingId:       dto.meetingId,
      title:           dto.title,
      description:     dto.description,
      options:         dto.options ?? ["YES", "NO", "ABSTAIN"],
      durationSeconds: dto.durationSeconds,
      orderIndex:      dto.orderIndex,
    });

    const openedMotion = await this.motionRepo.updateStatus(motion.id, "OPEN", { openedAt: new Date() });

    // Trigger in-app notification
    await NotificationService.notifyOrganization(
      dto.organizationId,
      "Nueva votación activa",
      `Se abrió la votación para: "${openedMotion.title}"`,
      "VOTE_OPENED",
      openedMotion.id
    );

    return openedMotion;
  }
}
