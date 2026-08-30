import { Router, Request, Response } from "express";
import {
  meetingRepo,
  motionRepo,
  voteRepo,
  memberRepo,
} from "../../../application/container";
import { WhatsAppWebhookService } from "../../../application/services/WhatsAppWebhookService";

const router = Router();
const whatsappService = new WhatsAppWebhookService(voteRepo, motionRepo, meetingRepo, memberRepo);

/**
 * GET /api/v1/webhooks/whatsapp
 * Meta Webhook verification handshake endpoint.
 */
router.get("/whatsapp", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  const verifiedChallenge = whatsappService.verifyWebhook(mode, token, challenge);
  if (verifiedChallenge !== null) {
    console.log("[WhatsApp Webhook] Handshake verified successfully with Meta.");
    return res.status(200).send(verifiedChallenge);
  }

  console.warn("[WhatsApp Webhook] Handshake verification failed. Invalid token or mode.");
  return res.sendStatus(403);
});

/**
 * POST /api/v1/webhooks/whatsapp
 * Ingests incoming WhatsApp messages sent by Meta Cloud API.
 */
router.post("/whatsapp", async (req: Request, res: Response) => {
  // Always return 200 to Meta immediately to prevent retry spam
  res.status(200).json({ status: "received" });

  try {
    const messages = whatsappService.extractMessagesFromMetaPayload(req.body);
    for (const msg of messages) {
      console.log(`[WhatsApp Webhook] Processing message from ${msg.from}: "${msg.body}"`);
      const result = await whatsappService.processIncomingMessage(msg);
      console.log(`[WhatsApp Webhook] Result:`, result);
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing webhook payload:", error);
  }
});

/**
 * POST /api/v1/webhooks/whatsapp/simulate
 * Developer & Testing endpoint: simulates an incoming WhatsApp message directly
 * without requiring live Meta Cloud API setup.
 */
router.post("/whatsapp/simulate", async (req: Request, res: Response) => {
  const { from, body } = req.body;
  if (!from || !body) {
    return res.status(400).json({
      success: false,
      message: "Both 'from' (phone number) and 'body' (message text) are required."
    });
  }

  const result = await whatsappService.processIncomingMessage({ from, body });
  return res.status(result.success ? 200 : 422).json(result);
});

/**
 * POST /api/v1/webhooks/telegram
 * Telegram bot updates webhook ingestion
 */
router.post("/telegram", async (req: Request, res: Response) => {
  res.status(200).json({ status: "received" });
});

export default router;
