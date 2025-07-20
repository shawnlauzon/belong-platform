import { IsPersisted } from '@/shared';

export type ResourceTimeslot = IsPersisted<ResourceTimeslotInput> & {
  status: 'available' | 'maybeAvailable' | 'unavailable';
};

export type ResourceTimeslotSummary = ResourceTimeslotInput & {
  id: string;
  claims: string[];
  status: 'available' | 'maybeAvailable' | 'unavailable';
};

export type ResourceTimeslotInput = {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  maxClaims: number;
};
