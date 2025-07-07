import { Coordinates } from '../../../shared';
import { User } from '../../users';
import { Polygon } from './geojson';

// Boundary types for communities
export type TravelMode = 'walking' | 'cycling' | 'driving';

export interface IsochroneBoundary {
  type: 'isochrone';
  travelMode: TravelMode;
  travelTimeMin: number; // Travel time in minutes (5-60)
  polygon: Polygon; // Actual isochrone polygon from Mapbox API
  areaSqKm: number; // Area in square kilometers
}

export type CommunityBoundary = IsochroneBoundary;

export interface Community extends Omit<CommunityData, 'organizerId'> {
  id: string;
  organizer: User;

  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityData {
  // Core Identity
  name: string; // e.g., "Rhode Island", "Cambridge", "Downtown Austin"
  description?: string;
  icon?: string; // Visual icon for the community
  bannerImageUrl?: string; // Banner image for the community

  // Location (mandatory center point)
  center: Coordinates;

  // Boundary configuration (new isochrone support)
  boundary?: CommunityBoundary;

  // Status & Metadata
  memberCount?: number;
  timeZone: string;
}

// Info version for list operations - includes all domain properties but only IDs for references
export interface CommunityInfo extends Omit<Community, 'organizer'> {
  organizerId: string; // Replaces organizer: User
}

// For filtering communities
export interface CommunityFilter {
  name?: string;
  organizerId?: string;
}

// Community membership types
export interface CommunityMembership
  extends Omit<CommunityMembershipData, 'userId' | 'communityId'> {
  joinedAt: Date;
  user: User;
  community: Community;
}

export interface CommunityMembershipData {
  userId: string;
  communityId: string;
}

export interface CommunityMembershipInfo extends CommunityMembershipData {
  joinedAt: Date;
}
