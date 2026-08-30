import { prisma } from "../database/prismaClient";
import { Vote, VoteChoice, VoteSource } from "../../domain/entities/Vote";
import { IVoteRepository, CastVoteInput, VoteTallyRow } from "../../domain/repositories/IVoteRepository";
import { ConflictError } from "../../shared/errors/AppErrors";

function toEntity(raw: any): Vote {
  return new Vote({
    id:       raw.id,
    motionId: raw.motionId,
    userId:   raw.userId,
    choice:   raw.choice as VoteChoice,
    castAt:   raw.castAt,
    source:   raw.source as VoteSource,
  });
}

export class PrismaVoteRepository implements IVoteRepository {
  async cast(input: CastVoteInput): Promise<Vote> {
    const alreadyVoted = await this.existsByMotionAndUser(input.motionId, input.userId);
    if (alreadyVoted) {
      throw new ConflictError(`User '${input.userId}' has already voted on motion '${input.motionId}'.`);
    }
    try {
      const raw = await prisma.vote.create({
        data: { motionId: input.motionId, userId: input.userId, choice: input.choice, source: input.source ?? "WEB" },
      });
      return toEntity(raw);
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new ConflictError(`Duplicate vote rejected: user '${input.userId}' on motion '${input.motionId}'.`);
      }
      throw err;
    }
  }

  async findByMotion(motionId: string): Promise<Vote[]> {
    const rows = await prisma.vote.findMany({ where: { motionId }, orderBy: { castAt: "asc" } });
    return rows.map(toEntity);
  }

  async existsByMotionAndUser(motionId: string, userId: string): Promise<boolean> {
    const count = await prisma.vote.count({ where: { motionId, userId } });
    return count > 0;
  }

  async tallyByMotion(motionId: string): Promise<VoteTallyRow[]> {
    const rows = await prisma.$queryRaw<Array<{ choice: string; count: bigint; coefficient_sum: string | null }>>`
      SELECT v.choice, COUNT(v.id) AS count, SUM(p.coefficient_share)::TEXT AS coefficient_sum
      FROM votes v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN properties p ON p.owner_id = u.id AND p.organization_id = u.organization_id
      WHERE v.motion_id = ${motionId}::uuid
      GROUP BY v.choice
    `;
    return rows.map((r) => ({
      choice: r.choice as VoteChoice,
      count: Number(r.count),
      coefficientSum: r.coefficient_sum ? parseFloat(r.coefficient_sum) : 0,
    }));
  }
}