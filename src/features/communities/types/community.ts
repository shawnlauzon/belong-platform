import { Polygon } from './geojson';
import { Coordinates, IsPersisted } from '@/shared';

export type Community = IsPersisted<CommunityInput>;

// For creating / updating Community
export type CommunityInput = {
  name: string;
  type: CommunityType;
  icon?: string; // Visual icon for the community
  organizerId: string;

  description?: string;
  bannerImageUrl?: string; // Banner image for the community

  // Location (mandatory center point)
  center: Coordinates;
  centerName?: string; // Human-readable name for the community center location

  // Boundary configuration (new isochrone support)
  boundary?: CommunityBoundary;

  // Status & Metadata
  timeZone: string;
  memberCount: number;

  // Color customization
  color?: string;
};

// Community types
export type CommunityType = 'place' | 'interest';

// Boundary types for communities
export type TravelMode = 'walking' | 'cycling' | 'driving';

export type IsochroneBoundary = {
  type: 'isochrone';
  travelMode: TravelMode;
  travelTimeMin: number; // Travel time in minutes (5-60)
  polygon: Polygon; // Actual isochrone polygon from Mapbox API
  areaSqKm: number; // Area in square kilometers
};

export type CommunityBoundary = IsochroneBoundary;

// For filtering communities
export type CommunityFilter = {
  name?: string;
  organizerId?: string;
};
