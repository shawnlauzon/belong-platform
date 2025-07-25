import { CommunityFilter } from './types';

// Communities
export const communityKeys = {
  all: ['communities'] as const,
  lists: () => [...communityKeys.all, 'list'] as const,
  list: (filter: CommunityFilter) =>
    [...communityKeys.lists(), filter] as const,
  details: () => [...communityKeys.all, 'detail'] as const,
  detail: (id: string) => [...communityKeys.details(), id] as const,
};

export const communityMembersKeys = {
  all: ['communityMembers'] as const,
  lists: () => [...communityMembersKeys.all, 'list'] as const,
  list: (communityId: string) =>
    [...communityMembersKeys.lists(), communityId] as const,
};

export const userCommunitiesKeys = {
  all: ['userCommunities'] as const,
  lists: () => [...userCommunitiesKeys.all, 'list'] as const,
  list: (userId: string) => [...userCommunitiesKeys.lists(), userId] as const,
};
