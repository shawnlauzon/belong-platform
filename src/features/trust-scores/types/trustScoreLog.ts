import type { IsPersisted } from '@/shared';

export type TrustScoreLog = IsPersisted<TrustScoreLogData>;

export type TrustScoreLogData = {
  userId: string;
  communityId: string;
  actionType: string;
  actionId?: string;
  pointsChange: number;
  scoreBefore: number;
  scoreAfter: number;
  metadata?: Record<string, unknown>;
};
