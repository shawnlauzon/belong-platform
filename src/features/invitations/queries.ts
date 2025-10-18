// Query keys for React Query
export const invitationKeys = {
  all: ['invitations'] as const,
  memberCode: (communityId: string) =>
    [...invitationKeys.all, 'memberCode', communityId] as const,
  pendingConnections: (communityId?: string) =>
    [...invitationKeys.all, 'pending', communityId] as const,
  userConnections: (communityId: string) =>
    [...invitationKeys.all, 'userConnections', communityId] as const,
  details: () => [...invitationKeys.all, 'details'] as const,
  detail: (memberConnectionCode: string) =>
    [...invitationKeys.details(), memberConnectionCode] as const,
} as const;