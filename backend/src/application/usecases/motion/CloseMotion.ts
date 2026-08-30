import { Motion } from "../../../domain/entities/Motion";
import { IMotionRepository } from "../../../domain/repositories/IMotionRepository";
import { IMeetingRepository } from "../../../domain/repositories/IMeetingRepository";
import { IVoteRepository } from "../../../domain/repositories/IVoteRepository";
import { NotFoundError, UnprocessableError, ForbiddenError } from "../../../shared/errors/AppErrors";
import {
  calculateQuorum,
  QuorumConfig,
  VoteTally,
  QuorumResult,
} from "../../../domain/services/QuorumCalculator";
import { prisma } from "../../../infrastructure/database/prismaClient";

export interface CloseMotionDTO {
  motionId:       string;
  organizationId: string;
}

export interface CloseMotionResult {
  motion:       Motion;
  tally:        { yes: number; no: number; abstain: number };
  quorumResult: QuorumResult;
}

export class CloseMotionUseCase {
  constructor(
    private readonly motionRepo:  IMotionRepository,
    private readonly meetingRepo: IMeetingRepository,
    private readonly voteRepo:    IVoteRepository
  ) {}

  async execute(dto: CloseMotionDTO): Promise<CloseMotionResult> {
    const motion = await this.motionRepo.findById(dto.motionId);
    if (!motion) throw new NotFoundError("Motion", dto.motionId);

    const meeting = await this.meetingRepo.findById(motion.meetingId, dto.organizationId);
    if (!meeting) throw new ForbiddenError("Motion does not belong to your organization.");

    if (motion.isClosed()) {
      throw new UnprocessableError(`Motion '${dto.motionId}' is already CLOSED.`);
    }

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: dto.organizationId } });
    const settings = org.settings as any;
    const quorumConfig: QuorumConfig = {
      quorumType:      settings.quorumType ?? "HEADCOUNT",
      quorumThreshold: settings.quorumThreshold ?? 0.5,
    };

    const tallyRows = await this.voteRepo.tallyByMotion(dto.motionId);
    const tally: VoteTally = {
      yes:     tallyRows.find((r) => r.choice === "YES")?.count ?? 0,
      no:      tallyRows.find((r) => r.choice === "NO")?.count ?? 0,
      abstain: tallyRows.find((r) => r.choice === "ABSTAIN")?.count ?? 0,
      yesCoefficient:     tallyRows.find((r) => r.choice === "YES")?.coefficientSum ?? 0,
      noCoefficient:      tallyRows.find((r) => r.choice === "NO")?.coefficientSum ?? 0,
      abstainCoefficient: tallyRows.find((r) => r.choice === "ABSTAIN")?.coefficientSum ?? 0,
    };

    let totalUnits: number;
    if (quorumConfig.quorumType === "COEFFICIENT") {
      const result = await prisma.$queryRaw<[{ total: string }]>`
        SELECT COALESCE(SUM(coefficient_share), 0)::TEXT AS total
        FROM properties WHERE organization_id = ${dto.organizationId}::uuid
      `;
      totalUnits = parseFloat(result[0].total);
    } else {
      totalUnits = await prisma.user.count({
        where: { organizationId: dto.organizationId, isActive: true },
      });
    }

    const quorumResult = calculateQuorum(tally, quorumConfig, totalUnits);

    const closedMotion = await this.motionRepo.updateStatus(dto.motionId, "CLOSED", { closedAt: new Date() });

    return { motion: closedMotion, tally: { yes: tally.yes, no: tally.no, abstain: tally.abstain }, quorumResult };
  }
}