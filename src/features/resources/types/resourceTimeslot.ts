import { IsPersisted } from '@/shared';
import { ResourceClaim } from './resourceClaim';

export type ResourceTimeslot = IsPersisted<ResourceTimeslotInput> & {
  claims: ResourceClaim[];
  status: 'available' | 'maybeAvailable' | 'unavailable';
};

export type ResourceTimeslotInput = {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  maxClaims: number;
};
