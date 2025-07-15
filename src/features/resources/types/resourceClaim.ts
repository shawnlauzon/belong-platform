import { IsPersisted } from '@/shared';
import { ResourceClaimStatus } from './resourceRow';

export type ResourceClaim = IsPersisted<ResourceClaimInput>;

export type ResourceClaimInput = {
  resourceId: string;
  userId: string;
  timeslotId?: string;
  status?: ResourceClaimStatus;
  notes?: string;
};
