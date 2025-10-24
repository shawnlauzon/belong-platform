// Query keys for React Query
export const connectionKeys = {
  all: ['connections'] as const,
  userConnections: (communityId: string) =>
    [...connectionKeys.all, 'userConnections', communityId] as const,
} as const;
