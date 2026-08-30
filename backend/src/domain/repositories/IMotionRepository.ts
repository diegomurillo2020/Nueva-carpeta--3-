import { Motion, MotionStatus, VoteChoice } from "../entities/Motion";

export interface CreateMotionInput {
  meetingId: string;
  title: string;
  description?: string;
  options?: VoteChoice[];
  durationSeconds?: number;
  orderIndex?: number;
}

export interface IMotionRepository {
  create(input: CreateMotionInput): Promise<Motion>;
  findById(id: string): Promise<Motion | null>;
  findByMeeting(meetingId: string): Promise<Motion[]>;
  updateStatus(id: string, status: MotionStatus, extra?: { openedAt?: Date; closedAt?: Date }): Promise<Motion>;
}
