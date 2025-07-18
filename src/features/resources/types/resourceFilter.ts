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
};
