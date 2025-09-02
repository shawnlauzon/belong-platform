import { IsPersisted } from '@/shared';

export type CommunityMembership = Omit<
  IsPersisted<CommunityMembershipInput>,
  'id'
> & {
  role: CommunityMembershipRole;
};

export type CommunityMembershipRole = 'member' | 'organizer';

export type CommunityMembershipInput = {
  userId: string;
  communityId: string;
  role?: CommunityMembershipRole;
};
