import { IVoteRepository } from "../../domain/repositories/IVoteRepository";
import { IMotionRepository } from "../../domain/repositories/IMotionRepository";
import { IMeetingRepository } from "../../domain/repositories/IMeetingRepository";
import { IMemberRepository } from "../../domain/repositories/IMemberRepository";
import { CastVoteUseCase } from "../usecases/vote/CastVote";
import { VoteChoice } from "../../domain/entities/Vote";
import { prisma } from "../../infrastructure/database/prismaClient";
import { AppError, NotFoundError } from "../../shared/errors/AppErrors";

export interface WhatsAppIncomingMessage {
  from: string; // Phone number e.g. "18095550101" or "+18095550101"
  body: string; // Text e.g. "1", "YES", "SI", "NO", "VOTE motion-id YES"
  messageId?: string;
  timestamp?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  message: string;
  voteId?: string;
  motionId?: string;
  choice?: string;
  memberId?: string;
  memberName?: string;
}

export class WhatsAppWebhookService {
  private castVoteUC: CastVoteUseCase;

  constructor(
    private readonly voteRepo: IVoteRepository,
    private readonly motionRepo: IMotionRepository,
    private readonly meetingRepo: IMeetingRepository,
    private readonly memberRepo: IMemberRepository
  ) {
    this.castVoteUC = new CastVoteUseCase(voteRepo, motionRepo, meetingRepo, memberRepo);
  }

  /**
   * Meta Webhook Verification Handler (GET /api/v1/webhooks/whatsapp)
   */
  verifyWebhook(mode?: string, token?: string, challenge?: string): string | null {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "convo_secret_token";
    if (mode === "subscribe" && token === verifyToken) {
      return challenge ?? "";
    }
    return null;
  }

  /**
   * Normalizes different user reply styles to standard VoteChoice
   * Supports numbers (1,2,3), Spanish (SI, NO, ABSTENCION), and English (YES, NO, ABSTAIN)
   */
  normalizeChoice(raw: string): VoteChoice | null {
    const cleaned = raw.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (["1", "YES", "SI", "A FAVOR", "AFIRMATIVO", "APPROVE"].includes(cleaned)) {
      return "YES";
    }
    if (["2", "NO", "EN CONTRA", "REJECT", "NEGATIVO"].includes(cleaned)) {
      return "NO";
    }
    if (["3", "ABSTAIN", "ABSTENCION", "BLANCO", "NEUTRO"].includes(cleaned)) {
      return "ABSTAIN";
    }
    return null;
  }

  /**
   * Sanitizes phone number by removing spaces, dashes, parentheses and leading '+'
   */
  normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  /**
   * Processes an incoming WhatsApp message payload from Meta or simulation
   */
  async processIncomingMessage(msg: WhatsAppIncomingMessage): Promise<WebhookProcessResult> {
    const cleanPhone = this.normalizePhone(msg.from);
    if (!cleanPhone) {
      return { success: false, message: "Invalid or empty phone number." };
    }

    // 1. Find member by phone number (matching exact or suffix without country code)
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { phoneNumber: msg.from },
          { phoneNumber: `+${cleanPhone}` },
          { phoneNumber: cleanPhone },
          { phoneNumber: { contains: cleanPhone.slice(-10) } }
        ]
      }
    });

    if (members.length === 0) {
      return {
        success: false,
        message: `No active member found registered with phone number '${msg.from}'. Please register your phone in the member directory.`
      };
    }

    const member = members[0];
    if (!member.isActive) {
      return {
        success: false,
        message: `Member '${member.fullName}' is currently marked as inactive.`
      };
    }

    // 2. Parse motion ID and vote choice from message text
    // Format A: "VOTE <motion-id> <choice>" or "MOCION <id> <choice>"
    // Format B: "<choice>" (defaults to currently active OPEN motion in LIVE meeting)
    const parts = msg.body.trim().split(/\s+/);
    let targetMotionId: string | null = null;
    let rawChoice = msg.body.trim();

    if (parts.length >= 3 && ["VOTE", "VOTAR", "MOCION", "MOTION"].includes(parts[0].toUpperCase())) {
      targetMotionId = parts[1];
      rawChoice = parts.slice(2).join(" ");
    }

    const normalizedChoice = this.normalizeChoice(rawChoice);
    if (!normalizedChoice) {
      return {
        success: false,
        message: `Unrecognized choice '${msg.body}'. Please reply with:\n1 for YES\n2 for NO\n3 for ABSTAIN`
      };
    }

    if (!member.organizationId) {
      return {
        success: false,
        message: "This member account is not attached to any specific condominium organization."
      };
    }

    // 3. If no motionId specified in message, locate the currently OPEN motion for this organization
    if (!targetMotionId) {
      const openMotions = await prisma.motion.findMany({
        where: {
          status: "OPEN",
          meeting: {
            organizationId: member.organizationId,
            status: "LIVE"
          }
        },
        orderBy: { createdAt: "desc" },
        take: 1
      });

      if (openMotions.length === 0) {
        return {
          success: false,
          message: "There is currently no open motion being voted on in a live meeting."
        };
      }
      targetMotionId = openMotions[0].id;
    }

    // 4. Cast the vote through the domain use case
    try {
      const vote = await this.castVoteUC.execute({
        motionId: targetMotionId,
        userId: member.id,
        organizationId: member.organizationId,
        choice: normalizedChoice,
        source: "WHATSAPP"
      });

      return {
        success: true,
        message: `¡Voto registrado exitosamente! Elección: ${vote.choice}. Gracias por participar, ${member.fullName}.`,
        voteId: vote.id,
        motionId: vote.motionId,
        choice: vote.choice,
        memberId: member.id,
        memberName: member.fullName
      };
    } catch (err: unknown) {
      if (err instanceof AppError) {
        return {
          success: false,
          message: err.message,
          memberId: member.id,
          memberName: member.fullName,
          motionId: targetMotionId
        };
      }
      return {
        success: false,
        message: "An unexpected error occurred while casting your vote."
      };
    }
  }

  /**
   * Parses standard Meta WhatsApp Cloud API webhook JSON payload
   */
  extractMessagesFromMetaPayload(body: any): WhatsAppIncomingMessage[] {
    const results: WhatsAppIncomingMessage[] = [];
    if (!body || !body.entry) return results;

    for (const entry of body.entry) {
      if (!entry.changes) continue;
      for (const change of entry.changes) {
        const value = change.value;
        if (!value || !value.messages) continue;

        for (const msg of value.messages) {
          let textBody = "";
          if (msg.type === "text" && msg.text) {
            textBody = msg.text.body;
          } else if (msg.type === "interactive") {
            if (msg.interactive.button_reply) {
              textBody = msg.interactive.button_reply.id || msg.interactive.button_reply.title;
            } else if (msg.interactive.list_reply) {
              textBody = msg.interactive.list_reply.id || msg.interactive.list_reply.title;
            }
          } else if (msg.type === "button" && msg.button) {
            textBody = msg.button.text || msg.button.payload;
          }

          if (textBody && msg.from) {
            results.push({
              from: msg.from,
              body: textBody,
              messageId: msg.id,
              timestamp: msg.timestamp
            });
          }
        }
      }
    }

    return results;
  }
}
