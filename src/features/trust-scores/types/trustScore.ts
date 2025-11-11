import type { IsPersisted } from '@/shared';

export type TrustScore = Omit<IsPersisted<TrustScoreData>, 'id'>;

export type TrustScoreData = {
  userId: string;
  communityId: string;
  score: number;
  lastCalculatedAt: Date;
};
