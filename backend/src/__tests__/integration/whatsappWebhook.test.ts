import { WhatsAppWebhookService } from "../../application/services/WhatsAppWebhookService";
import { Meeting } from "../../domain/entities/Meeting";
import { Motion } from "../../domain/entities/Motion";
import { Vote } from "../../domain/entities/Vote";
import { Member } from "../../domain/entities/Member";

describe("Task 4: WhatsApp Webhook Ingestion", () => {
  let service: WhatsAppWebhookService;

  const mockMeeting = new Meeting({
    id: "meeting-123",
    organizationId: "org-1",
    title: "Asamblea General 2026",
    status: "LIVE",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const mockMotion = new Motion({
    id: "motion-456",
    meetingId: "meeting-123",
    title: "Aprobación de Presupuesto",
    options: ["YES", "NO", "ABSTAIN"],
    status: "OPEN",
    orderIndex: 0,
    createdAt: new Date()
  });

  const mockMember = new Member({
    id: "user-789",
    organizationId: "org-1",
    fullName: "Juan Pérez",
    phoneNumber: "+18095550101",
    role: "MEMBER",
    isActive: true,
    createdAt: new Date()
  });

  const mockMeetingRepo = {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(mockMeeting),
    findByOrganization: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockMotionRepo = {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(mockMotion),
    findByMeeting: jest.fn().mockResolvedValue([mockMotion]),
    updateStatus: jest.fn(),
  };

  const mockMemberRepo = {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(mockMember),
    findByPhone: jest.fn().mockResolvedValue(mockMember),
    findByOrganization: jest.fn().mockResolvedValue([mockMember]),
    setActive: jest.fn(),
  };

  const castVotesStore: Vote[] = [];
  const mockVoteRepo = {
    cast: jest.fn().mockImplementation(async (input: any) => {
      const v = new Vote({
        id: `vote-${Date.now()}`,
        ...input,
        castAt: new Date(),
        source: input.source ?? "WHATSAPP",
      });
      castVotesStore.push(v);
      return v;
    }),
    existsByMotionAndUser: jest.fn().mockImplementation(async (motionId: string, userId: string) => {
      return castVotesStore.some(v => v.motionId === motionId && v.userId === userId);
    }),
    getTallyByMotion: jest.fn(),
    findByMotion: jest.fn(),
  };

  beforeEach(() => {
    castVotesStore.length = 0;
    jest.clearAllMocks();
    service = new WhatsAppWebhookService(
      mockVoteRepo as any,
      mockMotionRepo as any,
      mockMeetingRepo as any,
      mockMemberRepo as any
    );
  });

  describe("Webhook Verification (Meta Challenge)", () => {
    it("returns challenge token when verify_token matches", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "test_token_123";
      const challenge = service.verifyWebhook("subscribe", "test_token_123", "challenge_987");
      expect(challenge).toBe("challenge_987");
    });

    it("returns null when verify_token does not match", () => {
      process.env.WHATSAPP_VERIFY_TOKEN = "test_token_123";
      const challenge = service.verifyWebhook("subscribe", "wrong_token", "challenge_987");
      expect(challenge).toBeNull();
    });
  });

  describe("Choice Normalization", () => {
    it("normalizes English and Spanish YES variants", () => {
      expect(service.normalizeChoice("1")).toBe("YES");
      expect(service.normalizeChoice("SI")).toBe("YES");
      expect(service.normalizeChoice("Sí")).toBe("YES");
      expect(service.normalizeChoice("yes")).toBe("YES");
      expect(service.normalizeChoice("A FAVOR")).toBe("YES");
    });

    it("normalizes English and Spanish NO variants", () => {
      expect(service.normalizeChoice("2")).toBe("NO");
      expect(service.normalizeChoice("no")).toBe("NO");
      expect(service.normalizeChoice("EN CONTRA")).toBe("NO");
    });

    it("normalizes English and Spanish ABSTAIN variants", () => {
      expect(service.normalizeChoice("3")).toBe("ABSTAIN");
      expect(service.normalizeChoice("abstain")).toBe("ABSTAIN");
      expect(service.normalizeChoice("abstencion")).toBe("ABSTAIN");
      expect(service.normalizeChoice("Abstención")).toBe("ABSTAIN");
    });

    it("returns null for unrecognized strings", () => {
      expect(service.normalizeChoice("hello")).toBeNull();
      expect(service.normalizeChoice("4")).toBeNull();
      expect(service.normalizeChoice("maybe")).toBeNull();
    });
  });

  describe("Meta Payload Parsing", () => {
    it("correctly extracts text messages from standard Meta webhook payload", () => {
      const metaPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: { display_phone_number: "15550001", phone_number_id: "12345" },
                  messages: [
                    {
                      from: "18095550101",
                      id: "wamid.HBgLMTgwOTU1NTAxMDEVAgASGBgyM...",
                      timestamp: "1724930000",
                      text: { body: "1" },
                      type: "text"
                    }
                  ]
                },
                field: "messages"
              }
            ]
          }
        ]
      };

      const msgs = service.extractMessagesFromMetaPayload(metaPayload);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].from).toBe("18095550101");
      expect(msgs[0].body).toBe("1");
    });
  });
});
