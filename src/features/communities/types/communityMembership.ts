import { IsPersisted } from '@/shared';
import type { Database } from '@/shared/types/database';

export type CommunityMembership = Omit<
  IsPersisted<CommunityMembershipInput>,
  'id'
> & {
  role: CommunityMembershipRole;
};

export type CommunityMembershipRole = Database['public']['Enums']['community_membership_role'];

export type CommunityMembershipInput = {
  userId: string;
  communityId: string;
  role?: CommunityMembershipRole;
};
