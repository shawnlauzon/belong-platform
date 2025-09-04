export const trustScoreKeys = {
  all: ['trustScores'] as const,
  lists: () => [...trustScoreKeys.all, 'list'] as const,
  listsByUser: () => [...trustScoreKeys.lists(), 'byUser'] as const,
  listByUser: (userId: string) =>
    [...trustScoreKeys.listsByUser(), userId] as const,
  logs: () => [...trustScoreKeys.all, 'logs'] as const,
  logsByUser: (userId: string) =>
    [...trustScoreKeys.logs(), 'byUser', userId] as const,
  logsByCommunity: (userId: string, communityId: string) =>
    [...trustScoreKeys.logs(), 'byCommunity', userId, communityId] as const,
};
