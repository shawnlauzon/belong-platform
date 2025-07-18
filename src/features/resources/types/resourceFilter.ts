import { ResourceStatus } from '..';

export type ResourceFilter = {
  category?: 'tools' | 'skills' | 'food' | 'supplies' | 'other' | 'all';
  type?: 'offer' | 'request' | 'all';
  communityId?: string;
  communityIds?: string[];
  ownerId?: string;
  status?: ResourceStatus;
  claimUserId?: string;
  maxDriveMinutes?: number;
  searchTerm?: string;
  includeCurrent?: boolean; // default true
  includeUpcoming?: boolean; // default true
  includePast?: boolean; // default true
  includeExpired?: boolean; // default false
};
