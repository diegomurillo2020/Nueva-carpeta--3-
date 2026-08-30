import { CastVoteUseCase } from "../../application/usecases/vote/CastVote";
import { CloseMotionUseCase } from "../../application/usecases/motion/CloseMotion";
import { UpdateMeetingStatusUseCase } from "../../application/usecases/meeting/UpdateMeetingStatus";
import { Meeting } from "../../domain/entities/Meeting";
import { Motion }  from "../../domain/entities/Motion";
import { Vote }    from "../../domain/entities/Vote";
import { Member }  from "../../domain/entities/Member";
import { ConflictError, UnprocessableError, ForbiddenError } from "../../shared/errors/AppErrors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMeeting(overrides: Partial<ConstructorParameters<typeof Meeting>[0]> = {}): Meeting {
  return new Meeting({ id: "meeting-1", organizationId: "org-1", title: "AGM 2026",
    status: "LIVE", createdAt: new Date(), updatedAt: new Date(), ...overrides });
}

function makeMotion(overrides: Partial<ConstructorParameters<typeof Motion>[0]> = {}): Motion {
  return new Motion({ id: "motion-1", meetingId: "meeting-1", title: "Approve Budget",
    options: ["YES", "NO", "ABSTAIN"], status: "OPEN", orderIndex: 0, createdAt: new Date(), ...overrides });
}

function makeMember(overrides: Partial<ConstructorParameters<typeof Member>[0]> = {}): Member {
  return new Member({ id: "user-1", organizationId: "org-1", fullName: "Alice",
    role: "MEMBER", isActive: true, createdAt: new Date(), ...overrides });
}

// ── Mock Repository Factories ──────────────────────────────────────────────────

function mockMeetingRepo(meeting: Meeting | null) {
  return {
    create:             jest.fn(),
    findById:           jest.fn().mockResolvedValue(meeting),
    findByOrganization: jest.fn(),
    updateStatus:       jest.fn().mockImplementation(async (_id: string, _org: string, status: any) =>
      new Meeting({ ...meeting!, status })),
  };
}

function mockMotionRepo(motion: Motion | null, updateImpl?: (id: string, status: any, extra?: any) => Promise<Motion>) {
  return {
    create:        jest.fn(),
    findById:      jest.fn().mockResolvedValue(motion),
    findByMeeting: jest.fn().mockResolvedValue(motion ? [motion] : []),
    updateStatus:  updateImpl
      ? jest.fn().mockImplementation(updateImpl)
      : jest.fn().mockImplementation(async (_id: string, status: any, extra?: any) =>
          new Motion({ ...motion!, status, ...extra })),
  };
}

function mockVoteRepo(alreadyVoted = false) {
  const store: Vote[] = [];
  return {
    cast: jest.fn().mockImplementation(async (input: any) => {
      if (alreadyVoted || store.some(v => v.userId === input.userId && v.motionId === input.motionId)) {
        throw new ConflictError("Duplicate vote.");
      }
      const v = new Vote({ id: `vote-${Date.now()}`, ...input, castAt: new Date(), source: input.source ?? "WEB" });
      store.push(v);
      return v;
    }),
    findByMotion:          jest.fn().mockResolvedValue(store),
    existsByMotionAndUser: jest.fn().mockResolvedValue(alreadyVoted),
    tallyByMotion:         jest.fn().mockResolvedValue([
      { choice: "YES", count: 3, coefficientSum: 0.35 },
      { choice: "NO",  count: 1, coefficientSum: 0.10 },
    ]),
  };
}

function mockMemberRepo(member: Member | null) {
  return {
    create:             jest.fn(),
    findById:           jest.fn().mockResolvedValue(member),
    findByPhone:        jest.fn(),
    findByOrganization: jest.fn(),
    setActive:          jest.fn(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CastVote Use Case", () => {
  it("casts a valid vote successfully", async () => {
    const uc = new CastVoteUseCase(
      mockVoteRepo(false) as any, mockMotionRepo(makeMotion()) as any,
      mockMeetingRepo(makeMeeting()) as any, mockMemberRepo(makeMember()) as any
    );
    const vote = await uc.execute({ motionId: "motion-1", userId: "user-1", organizationId: "org-1", choice: "YES" });
    expect(vote.choice).toBe("YES");
    expect(vote.motionId).toBe("motion-1");
  });

  it("throws ConflictError on duplicate vote", async () => {
    const uc = new CastVoteUseCase(
      mockVoteRepo(true) as any, mockMotionRepo(makeMotion()) as any,
      mockMeetingRepo(makeMeeting()) as any, mockMemberRepo(makeMember()) as any
    );
    await expect(
      uc.execute({ motionId: "motion-1", userId: "user-1", organizationId: "org-1", choice: "YES" })
    ).rejects.toThrow(ConflictError);
  });

  it("throws UnprocessableError when motion is CLOSED", async () => {
    const uc = new CastVoteUseCase(
      mockVoteRepo(false) as any, mockMotionRepo(makeMotion({ status: "CLOSED" })) as any,
      mockMeetingRepo(makeMeeting()) as any, mockMemberRepo(makeMember()) as any
    );
    await expect(
      uc.execute({ motionId: "motion-1", userId: "user-1", organizationId: "org-1", choice: "YES" })
    ).rejects.toThrow(UnprocessableError);
  });

  it("throws UnprocessableError when meeting is not LIVE", async () => {
    const uc = new CastVoteUseCase(
      mockVoteRepo(false) as any, mockMotionRepo(makeMotion()) as any,
      mockMeetingRepo(makeMeeting({ status: "DRAFT" })) as any, mockMemberRepo(makeMember()) as any
    );
    await expect(
      uc.execute({ motionId: "motion-1", userId: "user-1", organizationId: "org-1", choice: "YES" })
    ).rejects.toThrow(UnprocessableError);
  });

  it("throws ForbiddenError for inactive member", async () => {
    const uc = new CastVoteUseCase(
      mockVoteRepo(false) as any, mockMotionRepo(makeMotion()) as any,
      mockMeetingRepo(makeMeeting()) as any, mockMemberRepo(makeMember({ isActive: false })) as any
    );
    await expect(
      uc.execute({ motionId: "motion-1", userId: "user-1", organizationId: "org-1", choice: "YES" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws UnprocessableError for invalid choice", async () => {
    const uc = new CastVoteUseCase(
      mockVoteRepo(false) as any, mockMotionRepo(makeMotion({ options: ["YES", "NO"] })) as any,
      mockMeetingRepo(makeMeeting()) as any, mockMemberRepo(makeMember()) as any
    );
    await expect(
      uc.execute({ motionId: "motion-1", userId: "user-1", organizationId: "org-1", choice: "ABSTAIN" })
    ).rejects.toThrow(UnprocessableError);
  });
});

describe("UpdateMeetingStatus Use Case", () => {
  it("transitions DRAFT -> LIVE", async () => {
    const uc = new UpdateMeetingStatusUseCase(
      mockMeetingRepo(makeMeeting({ status: "DRAFT" })) as any,
      mockMotionRepo(null) as any
    );
    const result = await uc.execute({ meetingId: "meeting-1", organizationId: "org-1", targetStatus: "LIVE" });
    expect(result.status).toBe("LIVE");
  });

  it("rejects DRAFT -> CLOSED (invalid transition)", async () => {
    const uc = new UpdateMeetingStatusUseCase(
      mockMeetingRepo(makeMeeting({ status: "DRAFT" })) as any,
      mockMotionRepo(null) as any
    );
    await expect(
      uc.execute({ meetingId: "meeting-1", organizationId: "org-1", targetStatus: "CLOSED" })
    ).rejects.toThrow(UnprocessableError);
  });

  it("auto-closes open motions when meeting closes", async () => {
    const openMotion = makeMotion({ status: "OPEN" });
    const updateSpy = jest.fn().mockResolvedValue({ ...openMotion, status: "CLOSED" } as any);
    const uc = new UpdateMeetingStatusUseCase(
      mockMeetingRepo(makeMeeting({ status: "LIVE" })) as any,
      mockMotionRepo(openMotion, updateSpy) as any
    );
    await uc.execute({ meetingId: "meeting-1", organizationId: "org-1", targetStatus: "CLOSED" });
    expect(updateSpy).toHaveBeenCalledWith("motion-1", "CLOSED", expect.objectContaining({ closedAt: expect.any(Date) }));
  });
});