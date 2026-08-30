import { Meeting } from "../../../domain/entities/Meeting";
import { IMeetingRepository } from "../../../domain/repositories/IMeetingRepository";
import { NotificationService } from "../../services/NotificationService";

export interface CreateMeetingDTO {
  organizationId: string;
  title: string;
}

export class CreateMeetingUseCase {
  constructor(private readonly meetingRepo: IMeetingRepository) {}

  async execute(dto: CreateMeetingDTO): Promise<Meeting> {
    if (!dto.title.trim()) throw new Error("Meeting title cannot be blank.");
    const meeting = await this.meetingRepo.create({ organizationId: dto.organizationId, title: dto.title.trim() });
    
    // Trigger in-app notification
    await NotificationService.notifyOrganization(
      dto.organizationId,
      "Nueva reunión convocada",
      `Se ha convocado la reunión: "${meeting.title}"`,
      "MEETING_CREATED",
      meeting.id
    );

    return meeting;
  }
}
