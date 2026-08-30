import { Meeting, MeetingStatus } from "../entities/Meeting";

export interface CreateMeetingInput {
  organizationId: string;
  title: string;
}

export interface IMeetingRepository {
  create(input: CreateMeetingInput): Promise<Meeting>;
  findById(id: string, organizationId: string): Promise<Meeting | null>;
  findByOrganization(organizationId: string): Promise<Meeting[]>;
  updateStatus(
    id: string,
    organizationId: string,
    status: MeetingStatus,
    extra?: { startTime?: Date; endTime?: Date; transcriptSummary?: string }
  ): Promise<Meeting>;
}
