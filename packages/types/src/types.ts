import { Coordinates } from '@belongnetwork/core';

// Additional API-specific types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// This file contains two types of data:
// 1. Resource data containing IDs (used for database insert / update operations
//    and so can omit fields that can't be set by the user)
// 2. Resource data containing full objects (used for API responses)
// Everything else can be derived from these two

export interface ResourceData {
  type: 'offer' | 'request';
  category: ResourceCategory;
  title: string;
  description: string;
  communityId: string;
  imageUrls?: string[];
  location?: { lat: number; lng: number };
  pickupInstructions?: string;
  parkingInfo?: string;
  meetupFlexibility?: MeetupFlexibility;
  availability?: string;
  isActive: boolean;
}

export interface Resource extends Omit<ResourceData, 'communityId'> {
  id: string;
  owner: User;
  community: Community;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityData {
  // Core Identity
  name: string; // e.g., "Rhode Island", "Cambridge", "Downtown Austin"
  description?: string;

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

export interface Community extends Omit<CommunityData, 'organizerId'> {
  id: string;
  organizer: User;

  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateThanksData {
  from_user_id: string;
  to_user_id: string;
  resource_id: string;
  message: string;
  image_urls?: string[];
  impact_description?: string;
}

export interface UpdateThanksData extends Partial<CreateThanksData> {
  id: string;
}

export interface Thanks extends CreateThanksData {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
  location?: Coordinates;
  createdAt: Date;
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UserData
  extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {}

export interface Account {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  location?: Coordinates;
  created_at: Date;
  updated_at: Date;
}

export interface UserFilter {
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export enum ResourceCategory {
  TOOLS = 'tools',
  SKILLS = 'skills',
  FOOD = 'food',
  SUPPLIES = 'supplies',
  OTHER = 'other',
}

export enum MeetupFlexibility {
  HOME_ONLY = 'home_only',
  PUBLIC_MEETUP_OK = 'public_meetup_ok',
  DELIVERY_POSSIBLE = 'delivery_possible',
}

export interface MeetupSpot {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export interface Hangout extends HangoutData {
  community: Community;
  attendee_count: number;
}

export type NewHangout = Omit<HangoutData, 'id'>;

export interface HangoutData {
  id: string;
  community_id: string;
  title: string;
  date: string;
  location: string;
  parking: string;
  description: string;
}

export interface ResourceFilter {
  category?: 'tools' | 'skills' | 'food' | 'supplies' | 'other' | 'all';
  type?: 'offer' | 'request' | 'all';
  communityId?: string;
  ownerId?: string;
  isActive?: boolean;
  maxDriveMinutes?: number;
  searchTerm?: string;
  minTrustScore?: number;
}
