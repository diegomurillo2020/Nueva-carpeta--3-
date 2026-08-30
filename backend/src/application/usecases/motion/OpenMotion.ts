import { Motion } from "../../../domain/entities/Motion";
import { VoteChoice } from "../../../domain/entities/Motion";
import { IMotionRepository } from "../../../domain/repositories/IMotionRepository";
import { IMeetingRepository } from "../../../domain/repositories/IMeetingRepository";
import { NotFoundError, UnprocessableError } from "../../../shared/errors/AppErrors";

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

    if (!meeting.isLive()) {
      throw new UnprocessableError(
        `Cannot open a motion on a meeting with status '${meeting.status}'. Meeting must be LIVE.`
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

    return this.motionRepo.updateStatus(motion.id, "OPEN", { openedAt: new Date() });
  }
}