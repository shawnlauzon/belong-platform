import type { IsPersisted } from '@/shared';
import type { ActionType } from '@/features/notifications';

export type TrustScoreLog = IsPersisted<TrustScoreLogData>;

export type TrustScoreLogData = {
  userId: string;
  communityId: string;
  actionType: ActionType;
  actionId?: string;
  pointsChange: number;
  scoreBefore: number;
  scoreAfter: number;
  metadata?: Record<string, unknown>;
};
