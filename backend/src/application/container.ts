import { PrismaMeetingRepository } from "../infrastructure/repositories/PrismaMeetingRepository";
import { PrismaMotionRepository }  from "../infrastructure/repositories/PrismaMotionRepository";
import { PrismaVoteRepository }    from "../infrastructure/repositories/PrismaVoteRepository";
import { PrismaMemberRepository }  from "../infrastructure/repositories/PrismaMemberRepository";

import { CreateMeetingUseCase }       from "./usecases/meeting/CreateMeeting";
import { UpdateMeetingStatusUseCase } from "./usecases/meeting/UpdateMeetingStatus";
import { OpenMotionUseCase }          from "./usecases/motion/OpenMotion";
import { CloseMotionUseCase }         from "./usecases/motion/CloseMotion";
import { CastVoteUseCase }            from "./usecases/vote/CastVote";
import { ManageMemberUseCase }        from "./usecases/member/ManageMember";

export const meetingRepo = new PrismaMeetingRepository();
export const motionRepo  = new PrismaMotionRepository();
export const voteRepo    = new PrismaVoteRepository();
export const memberRepo  = new PrismaMemberRepository();

export const createMeetingUC       = new CreateMeetingUseCase(meetingRepo);
export const updateMeetingStatusUC = new UpdateMeetingStatusUseCase(meetingRepo, motionRepo);
export const openMotionUC          = new OpenMotionUseCase(motionRepo, meetingRepo);
export const closeMotionUC         = new CloseMotionUseCase(motionRepo, meetingRepo, voteRepo);
export const castVoteUC            = new CastVoteUseCase(voteRepo, motionRepo, meetingRepo, memberRepo);
export const manageMemberUC        = new ManageMemberUseCase(memberRepo);