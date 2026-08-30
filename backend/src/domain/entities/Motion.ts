// =============================================================================
// Motion – Domain Entity
// A votable agenda item within a meeting.
// =============================================================================

export type MotionStatus = "OPEN" | "CLOSED";
export type VoteChoice  = "YES" | "NO" | "ABSTAIN";

export interface MotionProps {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  options: VoteChoice[];
  status: MotionStatus;
  durationSeconds?: number;
  openedAt?: Date;
  closedAt?: Date;
  orderIndex: number;
  createdAt: Date;
}

export class Motion {
  readonly id: string;
  readonly meetingId: string;
  readonly title: string;
  readonly description?: string;
  readonly options: VoteChoice[];
  readonly status: MotionStatus;
  readonly durationSeconds?: number;
  readonly openedAt?: Date;
  readonly closedAt?: Date;
  readonly orderIndex: number;
  readonly createdAt: Date;

  constructor(props: MotionProps) {
    this.id = props.id;
    this.meetingId = props.meetingId;
    this.title = props.title;
    this.description = props.description;
    this.options = props.options;
    this.status = props.status;
    this.durationSeconds = props.durationSeconds;
    this.openedAt = props.openedAt;
    this.closedAt = props.closedAt;
    this.orderIndex = props.orderIndex;
    this.createdAt = props.createdAt;
  }

  isOpen(): boolean   { return this.status === "OPEN"; }
  isClosed(): boolean { return this.status === "CLOSED"; }

  /** Validates a choice string against the motion's configured options. */
  isValidChoice(choice: string): choice is VoteChoice {
    return this.options.includes(choice as VoteChoice);
  }
}
