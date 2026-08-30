import { Vote } from "../../../domain/entities/Vote";
import { VoteChoice, VoteSource } from "../../../domain/entities/Vote";
import { IVoteRepository } from "../../../domain/repositories/IVoteRepository";
import { IMotionRepository } from "../../../domain/repositories/IMotionRepository";
import { IMeetingRepository } from "../../../domain/repositories/IMeetingRepository";
import { IMemberRepository } from "../../../domain/repositories/IMemberRepository";
import {
  NotFoundError,
  UnprocessableError,
  ForbiddenError,
  ConflictError,
} from "../../../shared/errors/AppErrors";

export interface CastVoteDTO {
  motionId:       string;
  userId:         string;
  organizationId: string;
  choice:         string;
  source?:        VoteSource;
}

export class CastVoteUseCase {
  constructor(
    private readonly voteRepo:    IVoteRepository,
    private readonly motionRepo:  IMotionRepository,
    private readonly meetingRepo: IMeetingRepository,
    private readonly memberRepo:  IMemberRepository
  ) {}

  async execute(dto: CastVoteDTO): Promise<Vote> {
    const motion = await this.motionRepo.findById(dto.motionId);
    if (!motion) throw new NotFoundError("Motion", dto.motionId);

    const meeting = await this.meetingRepo.findById(motion.meetingId, dto.organizationId);
    if (!meeting) {
      throw new ForbiddenError("Motion does not belong to your organization.");
    }

    if (!meeting.isLive()) {
      throw new UnprocessableError(
        `Cannot vote on a motion in a '${meeting.status}' meeting. Meeting must be LIVE.`
      );
    }

    if (motion.isClosed()) {
      throw new UnprocessableError(
        `Motion '${dto.motionId}' is CLOSED. No further votes are accepted.`
      );
    }

    if (!motion.isValidChoice(dto.choice)) {
      throw new UnprocessableError(
        `'${dto.choice}' is not a valid choice. Allowed: ${motion.options.join(", ")}.`
      );
    }

    const member = await this.memberRepo.findById(dto.userId, dto.organizationId);
    if (!member) throw new NotFoundError("Member", dto.userId);
    if (!member.canVote()) {
      throw new ForbiddenError("Inactive members cannot cast votes.");
    }

    const alreadyVoted = await this.voteRepo.existsByMotionAndUser(dto.motionId, dto.userId);
    if (alreadyVoted) {
      throw new ConflictError(
        `Member '${dto.userId}' has already voted on motion '${dto.motionId}'.`
      );
    }

    return this.voteRepo.cast({
      motionId: dto.motionId,
      userId:   dto.userId,
      choice:   dto.choice as VoteChoice,
      source:   dto.source ?? "WEB",
    });
  }
}