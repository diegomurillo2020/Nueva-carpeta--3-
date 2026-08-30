import { Vote, VoteChoice, VoteSource } from "../entities/Vote";

export interface CastVoteInput {
  motionId: string;
  userId: string;
  choice: VoteChoice;
  source?: VoteSource;
}

export interface VoteTallyRow {
  choice: VoteChoice;
  count: number;
  coefficientSum: number;
}

export interface IVoteRepository {
  cast(input: CastVoteInput): Promise<Vote>;
  findByMotion(motionId: string): Promise<Vote[]>;
  existsByMotionAndUser(motionId: string, userId: string): Promise<boolean>;
  tallyByMotion(motionId: string): Promise<VoteTallyRow[]>;
}
