import { ResourceClaimStatus } from './resourceRow';

export type ResourceClaimByResourceFilter = {
  userId?: string;
  status?: ResourceClaimStatus | ResourceClaimStatus[];
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
