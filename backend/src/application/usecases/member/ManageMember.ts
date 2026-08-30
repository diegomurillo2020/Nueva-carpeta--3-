import { Member } from "../../../domain/entities/Member";
import { IMemberRepository, CreateMemberInput } from "../../../domain/repositories/IMemberRepository";
import { NotFoundError } from "../../../shared/errors/AppErrors";

export class ManageMemberUseCase {
  constructor(private readonly memberRepo: IMemberRepository) {}

  async register(input: CreateMemberInput): Promise<Member> {
    return this.memberRepo.create(input);
  }

  async deactivate(id: string, organizationId: string): Promise<Member> {
    const member = await this.memberRepo.findById(id, organizationId);
    if (!member) throw new NotFoundError("Member", id);
    return this.memberRepo.setActive(id, organizationId, false);
  }

  async reactivate(id: string, organizationId: string): Promise<Member> {
    const member = await this.memberRepo.findById(id, organizationId);
    if (!member) throw new NotFoundError("Member", id);
    return this.memberRepo.setActive(id, organizationId, true);
  }

  async listByOrg(organizationId: string): Promise<Member[]> {
    return this.memberRepo.findByOrganization(organizationId);
  }
}