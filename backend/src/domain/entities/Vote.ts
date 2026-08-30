// =============================================================================
// Vote – Domain Entity (Immutable record)
// =============================================================================

export type VoteSource = "WEB" | "WHATSAPP" | "TELEGRAM";
export type VoteChoice = "YES" | "NO" | "ABSTAIN";

export interface VoteProps {
  id: string;
  motionId: string;
  userId: string;
  choice: VoteChoice;
  castAt: Date;
  source: VoteSource;
}

/** Votes are immutable once created – no mutating methods exposed. */
export class Vote {
  readonly id: string;
  readonly motionId: string;
  readonly userId: string;
  readonly choice: VoteChoice;
  readonly castAt: Date;
  readonly source: VoteSource;

  constructor(props: VoteProps) {
    this.id = props.id;
    this.motionId = props.motionId;
    this.userId = props.userId;
    this.choice = props.choice;
    this.castAt = props.castAt;
    this.source = props.source;
  }
}
