import { Meeting } from "../../../domain/entities/Meeting";
import { IMeetingRepository } from "../../../domain/repositories/IMeetingRepository";

export interface CreateMeetingDTO {
  organizationId: string;
  title: string;
}

export class CreateMeetingUseCase {
  constructor(private readonly meetingRepo: IMeetingRepository) {}

  async execute(dto: CreateMeetingDTO): Promise<Meeting> {
    if (!dto.title.trim()) throw new Error("Meeting title cannot be blank.");
    return this.meetingRepo.create({ organizationId: dto.organizationId, title: dto.title.trim() });
  }
}