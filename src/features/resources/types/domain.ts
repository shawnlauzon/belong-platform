import { Coordinates } from '@/shared';
import { Community } from '../../communities';
import { User } from '../../users';

export interface Resource extends Omit<ResourceData, 'communityId'> {
  id: string;
  owner: User;
  community?: Community;
  deletedAt?: Date;
  deletedBy?: string;
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
  location?: Coordinates;
  availability?: string;
}

// Info version for list operations - includes all domain properties but only IDs for references
export interface ResourceInfo extends Omit<Resource, 'owner' | 'community'> {
  ownerId: string; // Replaces owner: User
  communityId: string; // Replaces community?: Community
}

export interface ResourceFilter {
  category?: 'tools' | 'skills' | 'food' | 'supplies' | 'other' | 'all';
  type?: 'offer' | 'request' | 'all';
  communityId?: string;
  ownerId?: string;
  includeDeleted?: boolean;
  maxDriveMinutes?: number;
  searchTerm?: string;
  minTrustScore?: number;
}

// Note: ResourceFilters interface was a duplicate with different field names
// Consider consolidating with ResourceFilter if needed
