import { IsPersisted } from '@/shared';

export type CommunityMembership = Omit<
  IsPersisted<CommunityMembershipInput>,
  'id'
>;

export type CommunityMembershipInput = {
  userId: string;
  communityId: string;
};
