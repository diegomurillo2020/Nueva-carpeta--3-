import { Member, UserRole } from "../entities/Member";

export interface CreateMemberInput {
  organizationId: string;
  fullName: string;
  dniPassport?: string;
  email?: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface IMemberRepository {
  create(input: CreateMemberInput): Promise<Member>;
  findById(id: string, organizationId: string): Promise<Member | null>;
  findByPhone(phoneNumber: string, organizationId: string): Promise<Member | null>;
  findByOrganization(organizationId: string): Promise<Member[]>;
  setActive(id: string, organizationId: string, isActive: boolean): Promise<Member>;
}
