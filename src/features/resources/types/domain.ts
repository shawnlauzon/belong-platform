import { Coordinates } from '@/shared';
import { CommunityDetail } from '../../communities';
import { UserDetail } from '../../users';

export interface ResourceDetail
  extends Omit<ResourceData, 'ownerId' | 'communityId'> {
  id: string;
  owner: UserDetail;
  community?: CommunityDetail;
  createdAt: Date;
  updatedAt: Date;
}

// Enum needed for database operations
export enum ResourceCategory {
  TOOLS = 'tools',
  SKILLS = 'skills',
  FOOD = 'food',
  SUPPLIES = 'supplies',
  OTHER = 'other',
}

export interface ResourceData {
  type: 'offer' | 'request';
  category: ResourceCategory;
  title: string;
  description: string;
  communityId: string;
  imageUrls?: string[];
  location: string;
  coordinates?: Coordinates;
}

// Info version for list operations - includes all domain properties but only IDs for references
export interface ResourceInfo
  extends Omit<ResourceDetail, 'owner' | 'community'> {
  ownerId: string; // Replaces owner: User
  communityId: string; // Replaces community?: Community
}

export interface ResourceFilter {
  category?: 'tools' | 'skills' | 'food' | 'supplies' | 'other' | 'all';
  type?: 'offer' | 'request' | 'all';
  communityId?: string;
  communityIds?: string[];
  ownerId?: string;
  maxDriveMinutes?: number;
  searchTerm?: string;
  minTrustScore?: number;
}

// Note: ResourceFilters interface was a duplicate with different field names
// Consider consolidating with ResourceFilter if needed
