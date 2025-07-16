import { ResourceClaimStatus } from '@/index';
import { IsPersisted } from '@/shared';

export type ResourceClaim = IsPersisted<ResourceClaimInput> & {
  userId: string;
};

export type ResourceClaimInput = {
  resourceId: string;
  timeslotId: string;
  status?: ResourceClaimStatus;
  notes?: string;
};
