// Query keys for React Query
export const connectionKeys = {
  all: ['connections'] as const,
  userConnections: () =>
    [...connectionKeys.all, 'userConnections'] as const,
} as const;
