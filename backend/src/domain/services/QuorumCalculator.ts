// =============================================================================
// QuorumCalculator – pure domain service (no DB dependencies)
// Computes whether a set of votes meets the configured quorum threshold.
// =============================================================================

export type QuorumType = "HEADCOUNT" | "COEFFICIENT";

export interface QuorumConfig {
  quorumType: QuorumType;
  /** 0 to 1 (e.g. 0.51 = simple majority by coefficient) */
  quorumThreshold: number;
  allowAbstain?: boolean;
}

export interface VoteTally {
  yes: number;
  no: number;
  abstain: number;
  /** Sum of coefficient_share for all voters – only used in COEFFICIENT mode */
  yesCoefficient?: number;
  noCoefficient?: number;
  abstainCoefficient?: number;
}

export interface QuorumResult {
  quorumMet: boolean;
  totalVotes: number;
  coefficientParticipation?: number;
  winningChoice: "YES" | "NO" | "ABSTAIN" | "TIE" | "INSUFFICIENT";
}

/**
 * Calculates quorum using either HEADCOUNT or COEFFICIENT strategy.
 *
 * @param tally      - Current vote counts/coefficients.
 * @param config     - Organization quorum configuration.
 * @param totalUnits - Total number of active members (HEADCOUNT) or
 *                     total coefficient sum of the organization (COEFFICIENT).
 */
export function calculateQuorum(
  tally: VoteTally,
  config: QuorumConfig,
  totalUnits: number
): QuorumResult {
  const { yes, no, abstain } = tally;
  const totalVotes = yes + no + abstain;

  if (totalVotes === 0 || totalUnits === 0) {
    return { quorumMet: false, totalVotes: 0, winningChoice: "INSUFFICIENT" };
  }

  let quorumMet = false;
  let coefficientParticipation: number | undefined;

  if (config.quorumType === "COEFFICIENT") {
    const totalCoeffCast =
      (tally.yesCoefficient ?? 0) +
      (tally.noCoefficient ?? 0) +
      (tally.abstainCoefficient ?? 0);
    coefficientParticipation = totalCoeffCast / totalUnits;
    quorumMet = coefficientParticipation >= config.quorumThreshold;
  } else {
    // HEADCOUNT: percentage of eligible members who voted
    quorumMet = totalVotes / totalUnits >= config.quorumThreshold;
  }

  if (!quorumMet) {
    return { quorumMet: false, totalVotes, coefficientParticipation, winningChoice: "INSUFFICIENT" };
  }

  // Determine winning choice among yes/no (abstain never "wins")
  if (yes > no) return { quorumMet, totalVotes, coefficientParticipation, winningChoice: "YES" };
  if (no > yes)  return { quorumMet, totalVotes, coefficientParticipation, winningChoice: "NO" };
  return { quorumMet, totalVotes, coefficientParticipation, winningChoice: "TIE" };
}
