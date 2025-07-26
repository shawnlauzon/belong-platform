import { ResourceFilter } from './types';

// Resources
export const resourceKeys = {
  all: ['resources'] as const,

  // Returns ResourceSummary[]
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filter: ResourceFilter) => [...resourceKeys.lists(), filter] as const,

  // Returns Resource
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
};

export const resourceTimeslotKeys = {
  all: ['resource-timeslots'] as const,
  lists: () => [...resourceTimeslotKeys.all, 'list'] as const,
  listsByResource: () =>
    [...resourceTimeslotKeys.lists(), 'by-resource'] as const,
  listByResource: (resourceId: string) =>
    [...resourceTimeslotKeys.listsByResource(), resourceId] as const,
};

export const resourceClaimsKeys = {
  all: ['resource-claims'] as const,
  lists: () => [...resourceClaimsKeys.all, 'list'] as const,
  listsByClaimant: () =>
    [...resourceClaimsKeys.lists(), 'by-claimant'] as const,
  listByClaimant: (id: string) =>
    [...resourceClaimsKeys.listsByClaimant(), id] as const,
  listsByResourceOwner: () =>
    [...resourceClaimsKeys.lists(), 'by-resource-owner'] as const,
  listByResourceOwner: (id: string) =>
    [...resourceClaimsKeys.listsByResourceOwner(), id] as const,
  listsByResource: () =>
    [...resourceClaimsKeys.lists(), 'by-resource'] as const,
  listByResource: (id: string) =>
    [...resourceClaimsKeys.listsByResource(), id] as const,
  details: () => [...resourceClaimsKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceClaimsKeys.details(), id] as const,
};
