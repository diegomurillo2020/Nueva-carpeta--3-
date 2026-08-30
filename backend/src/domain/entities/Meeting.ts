// =============================================================================
// Meeting – Domain Entity
// Encapsulates business rules around meeting lifecycle transitions.
// =============================================================================

export type MeetingStatus = "DRAFT" | "LIVE" | "CLOSED";

export interface MeetingProps {
  id: string;
  organizationId: string;
  title: string;
  status: MeetingStatus;
  startTime?: Date;
  endTime?: Date;
  transcriptSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Meeting {
  readonly id: string;
  readonly organizationId: string;
  readonly title: string;
  readonly status: MeetingStatus;
  readonly startTime?: Date;
  readonly endTime?: Date;
  readonly transcriptSummary?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: MeetingProps) {
    Object.assign(this, props);
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.title = props.title;
    this.status = props.status;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.transcriptSummary = props.transcriptSummary;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Meeting can only go DRAFT -> LIVE -> CLOSED (no reversals). */
  canTransitionTo(next: MeetingStatus): boolean {
    const allowed: Record<MeetingStatus, MeetingStatus[]> = {
      DRAFT:  ["LIVE"],
      LIVE:   ["CLOSED"],
      CLOSED: [],
    };
    return allowed[this.status].includes(next);
  }

  isLive(): boolean  { return this.status === "LIVE"; }
  isClosed(): boolean { return this.status === "CLOSED"; }
}
