import { IsPersisted } from '@/shared';
import { ResourceClaimSummary } from './resourceClaim';

export type ResourceTimeslot = IsPersisted<ResourceTimeslotInput> & {
  claims: ResourceClaimSummary[];
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
