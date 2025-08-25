// Query keys for React Query
export const connectionQueries = {
  all: ['connections'] as const,
  memberCode: (communityId: string) => 
    [...connectionQueries.all, 'memberCode', communityId] as const,
  pendingConnections: (communityId?: string) => 
    [...connectionQueries.all, 'pending', communityId] as const,
  userConnections: (communityId: string) => 
    [...connectionQueries.all, 'userConnections', communityId] as const,
  details: () => [...connectionQueries.all, 'details'] as const,
  detail: (memberConnectionCode: string) => 
    [...connectionQueries.details(), memberConnectionCode] as const,
} as const;