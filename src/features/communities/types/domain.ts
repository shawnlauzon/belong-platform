import { Coordinates } from '../../../shared';
import { User } from '../../users';

export interface Community extends Omit<CommunityData, 'organizerId'> {
  id: string;
  organizer: User;
  parent?: Community;

  memberCount: number;
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields
  isActive: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  // Optional membership status for current user
  currentUserMembership?: CommunityMembership;
}

export interface CommunityMembership extends CommunityMembershipData {
  joinedAt: Date;
  user?: User;
  community?: Community;
}

export interface CommunityData {
  // Core Identity
  name: string; // e.g., "Rhode Island", "Cambridge", "Downtown Austin"
  description?: string;
  icon?: string; // Visual icon for the community

  organizerId: string;
  parentId: string | null; // Null only for global root

  center?: Coordinates;
  radiusKm?: number;

  // Geographic Hierarchy (flexible for any administrative structure)
  hierarchyPath: Array<{
    level: string; // "country", "state", "borough", "parish", "district", etc.
    name: string; // "United States", "Manhattan", "Orleans Parish", etc.
  }>;
  level: string; // Flexible - can be any administrative level

  // Status & Metadata
  memberCount: number;
  timeZone: string;
}

// Info version for list operations - includes all domain properties but only IDs for references
export interface CommunityInfo extends Omit<Community, 'organizer' | 'parent'> {
  organizerId: string; // Replaces organizer: User
  parentId: string | null; // Replaces parent?: Community
}

// For filtering communities
export interface CommunityFilter {
  name?: string;
  level?: string;
  organizerId?: string;
  parentId?: string;
  isActive?: boolean;
}

// Community membership types
export interface CommunityMembershipData {
  userId: string;
  communityId: string;
  role?: 'member' | 'admin' | 'organizer';
}

export interface CommunityMembership extends CommunityMembershipData {
  joinedAt: Date;
  user?: User;
  community?: Community;
}
