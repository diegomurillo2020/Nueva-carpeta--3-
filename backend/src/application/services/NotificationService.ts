import { prisma } from "../../infrastructure/database/prismaClient";

export type NotificationType = "MEETING_CREATED" | "VOTE_OPENED" | "MINUTES_READY";

export class NotificationService {
  /**
   * Dispatches notifications to all active members of a given organization
   */
  static async notifyOrganization(
    organizationId: string,
    title: string,
    message: string,
    type: NotificationType,
    referenceId?: string
  ): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: {
          organizationId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!users || users.length === 0) return;

      const notificationsData = users.map((user) => ({
        organizationId,
        userId: user.id,
        title,
        message,
        type,
        referenceId: referenceId || null,
        isRead: false,
      }));

      await prisma.notification.createMany({
        data: notificationsData,
      });

      console.log(`[NotificationService] Emitted ${notificationsData.length} ${type} notifications for org ${organizationId}`);
    } catch (error) {
      console.error("[NotificationService] Error creating notifications:", error);
    }
  }
}
