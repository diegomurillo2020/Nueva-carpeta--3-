// =============================================================================
// Member (User) – Domain Entity
// =============================================================================

export type UserRole = "ADMIN" | "MEMBER";

export interface MemberProps {
  id: string;
  organizationId: string;
  dniPassport?: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export class Member {
  readonly id: string;
  readonly organizationId: string;
  readonly dniPassport?: string;
  readonly fullName: string;
  readonly email?: string;
  readonly phoneNumber?: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly createdAt: Date;

  constructor(props: MemberProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.dniPassport = props.dniPassport;
    this.fullName = props.fullName;
    this.email = props.email;
    this.phoneNumber = props.phoneNumber;
    this.role = props.role;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  isAdmin(): boolean  { return this.role === "ADMIN"; }
  canVote(): boolean  { return this.isActive; }
}
