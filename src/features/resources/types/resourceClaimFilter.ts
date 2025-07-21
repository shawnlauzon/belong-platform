import { ResourceClaimStatus } from './resourceRow';

export type ResourceClaimFilter = {
  status?: ResourceClaimStatus | ResourceClaimStatus[];
  resourceId?: string | string[];
  resourceOwnerId?: string;
  claimantId?: string;
  timeslotId?: string;
  hasShoutout?: boolean;
};

export type ResourceClaimByResourceFilter = {
  status?: ResourceClaimStatus | ResourceClaimStatus[];
  userId?: string;
  timeslotId?: string;
};

export type ResourceClaimByUserFilter = {
  status?: ResourceClaimStatus | ResourceClaimStatus[];
  resourceId?: string;
  resourceOwnerId?: string;
  timeslotId?: string;
};

// type guards
export function isResourceClaimByResourceFilter(
  filter: ResourceClaimByUserFilter | ResourceClaimByResourceFilter,
): filter is ResourceClaimByResourceFilter {
  return 'userId' in filter;
}

export function isResourceClaimByUserFilter(
  filter: ResourceClaimByUserFilter | ResourceClaimByResourceFilter,
): filter is ResourceClaimByUserFilter {
  return 'resourceId' in filter;
}
