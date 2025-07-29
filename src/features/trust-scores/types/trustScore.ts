import type { IsPersisted } from '@/shared';

export type TrustScore = IsPersisted<TrustScoreData>;

export type TrustScoreData = {
  userId: string;
  communityId: string;
  score: number;
  lastCalculatedAt: Date;
};

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
