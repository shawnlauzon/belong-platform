import { ResourceStatus, ResourceType } from '..';

export type ResourceFilter = {
  category?: 'tools' | 'skills' | 'food' | 'supplies' | 'other' | 'all';
  type?: ResourceType | 'all';
  communityId?: string;
  communityIds?: string[];
  ownerId?: string;
  status?: ResourceStatus;
  claimUserId?: string;
  maxDriveMinutes?: number;
  searchTerm?: string;
  hasAvailableSlots?: boolean;
};
