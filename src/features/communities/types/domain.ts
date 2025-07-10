import { Coordinates } from '../../../shared';
import { UserDetail } from '../../users';
import { Polygon } from './geojson';

// Community types
export type CommunityType = 'place' | 'interest';

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

export interface CommunityDetail extends Omit<CommunityData, 'organizerId'> {
  id: string;
  organizer: UserDetail;

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
  type: CommunityType; // Type of community: place (geographic) or interest (topic-based)

  // Location (mandatory center point)
  center: Coordinates;
  centerName?: string; // Human-readable name for the community center location

  // Boundary configuration (new isochrone support)
  boundary?: CommunityBoundary;

  // Status & Metadata
  memberCount?: number;
  timeZone: string;
}

// Info version for list operations - includes all domain properties but only IDs for references
export interface CommunityInfo extends Omit<CommunityDetail, 'organizer'> {
  organizerId: string; // Replaces organizer: User
}

// For filtering communities
export interface CommunityFilter {
  name?: string;
  organizerId?: string;
}

export interface CommunityMembershipData {
  userId: string;
  communityId: string;
}

export interface CommunityMembershipInfo extends CommunityMembershipData {
  joinedAt: Date;
}
