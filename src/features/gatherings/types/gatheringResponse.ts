import { IsPersisted } from '@/shared';

export type GatheringResponse = Omit<IsPersisted<GatheringResponseInput>, 'id'>;

export type GatheringResponseInput = {
  gatheringId: string;
  userId: string;
  status: 'attending' | 'not_attending' | 'maybe';
};
