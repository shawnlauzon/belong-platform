export const trustScoreKeys = {
  all: ['trustScores'] as const,
  lists: () => [...trustScoreKeys.all, 'list'] as const,
  listsByUser: () => [...trustScoreKeys.lists(), 'byUser'] as const,
  listByUser: (userId: string) =>
    [...trustScoreKeys.listsByUser(), userId] as const,
};
