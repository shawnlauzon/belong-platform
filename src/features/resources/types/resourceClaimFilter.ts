import { ResourceClaimStatus } from './resourceRow';

export type ResourceClaimFilter = {
  userId?: string;
  status?: ResourceClaimStatus | ResourceClaimStatus[];
  resourceId?: string;
  resourceOwnerId?: string;
  timeslotId?: string;
};
