import { IsPersisted } from '@/shared';

export type ResourceTimeslot = IsPersisted<ResourceTimeslotInput>;

export type ResourceTimeslotInput = {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  maxClaims: number;
};
