import {
  calculateQuorum,
  QuorumConfig,
  VoteTally,
} from "../QuorumCalculator";

describe("QuorumCalculator", () => {
  // ---------------------------------------------------------------------------
  // HEADCOUNT mode
  // ---------------------------------------------------------------------------
  describe("HEADCOUNT mode", () => {
    const config: QuorumConfig = {
      quorumType: "HEADCOUNT",
      quorumThreshold: 0.5, // 50%+ of members must vote
    };

    it("returns INSUFFICIENT when no votes cast", () => {
      const tally: VoteTally = { yes: 0, no: 0, abstain: 0 };
      const result = calculateQuorum(tally, config, 10);
      expect(result.quorumMet).toBe(false);
      expect(result.winningChoice).toBe("INSUFFICIENT");
    });

    it("meets quorum when >50% of members voted YES", () => {
      const tally: VoteTally = { yes: 6, no: 2, abstain: 1 };
      const result = calculateQuorum(tally, config, 10);
      expect(result.quorumMet).toBe(true);
      expect(result.winningChoice).toBe("YES");
    });

    it("does NOT meet quorum when <50% voted", () => {
      const tally: VoteTally = { yes: 3, no: 1, abstain: 0 };
      const result = calculateQuorum(tally, config, 10);
      expect(result.quorumMet).toBe(false);
    });

    it("detects TIE when YES === NO and quorum met", () => {
      const tally: VoteTally = { yes: 3, no: 3, abstain: 1 };
      const result = calculateQuorum(tally, config, 10);
      expect(result.quorumMet).toBe(true);
      expect(result.winningChoice).toBe("TIE");
    });

    it("handles totalUnits = 0 gracefully", () => {
      const tally: VoteTally = { yes: 5, no: 0, abstain: 0 };
      const result = calculateQuorum(tally, config, 0);
      expect(result.quorumMet).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // COEFFICIENT mode (alícuotas / property shares)
  // ---------------------------------------------------------------------------
  describe("COEFFICIENT mode", () => {
    const config: QuorumConfig = {
      quorumType: "COEFFICIENT",
      quorumThreshold: 0.51, // 51% of total coefficient must participate
    };

    it("meets quorum when coefficient participation >= 51%", () => {
      // Total org coefficient = 1.0 (sum of all alícuotas)
      const tally: VoteTally = {
        yes: 3, no: 2, abstain: 1,
        yesCoefficient: 0.35,
        noCoefficient:  0.20,
        abstainCoefficient: 0.05,
      };
      const result = calculateQuorum(tally, config, 1.0);
      // participation = 0.60 >= 0.51 => met
      expect(result.quorumMet).toBe(true);
      expect(result.coefficientParticipation).toBeCloseTo(0.6);
      expect(result.winningChoice).toBe("YES");
    });

    it("does NOT meet quorum when coefficient participation < 51%", () => {
      const tally: VoteTally = {
        yes: 2, no: 1, abstain: 0,
        yesCoefficient: 0.25,
        noCoefficient:  0.15,
        abstainCoefficient: 0,
      };
      const result = calculateQuorum(tally, config, 1.0);
      // participation = 0.40 < 0.51
      expect(result.quorumMet).toBe(false);
    });

    it("handles exact threshold boundary (51% == 51%)", () => {
      const tally: VoteTally = {
        yes: 5, no: 0, abstain: 0,
        yesCoefficient: 0.51,
        noCoefficient: 0,
        abstainCoefficient: 0,
      };
      const result = calculateQuorum(tally, config, 1.0);
      expect(result.quorumMet).toBe(true);
    });

    it("uses 2/3 supermajority threshold correctly", () => {
      const superConfig: QuorumConfig = {
        quorumType: "COEFFICIENT",
        quorumThreshold: 0.667,
      };
      const tally: VoteTally = {
        yes: 4, no: 1, abstain: 0,
        yesCoefficient: 0.60,
        noCoefficient: 0.05,
        abstainCoefficient: 0,
      };
      // 0.65 < 0.667 => NOT met
      const result = calculateQuorum(tally, superConfig, 1.0);
      expect(result.quorumMet).toBe(false);
    });
  });
});
