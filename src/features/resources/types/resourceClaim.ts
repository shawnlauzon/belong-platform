import { IsPersisted } from '@/shared';
import { ResourceClaimStatus } from './resourceRow';

export type ResourceClaim = IsPersisted<ResourceClaimInput> & {
  userId: string;
};

export type ResourceClaimInput = {
  resourceId: string;
  timeslotId?: string;
  status?: ResourceClaimStatus;
  notes?: string;
};
