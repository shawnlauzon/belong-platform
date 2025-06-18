// Public API types - exported from root package
// Database types are kept separate and require explicit import

// Core interfaces
export interface Coordinates {
  lat: number;
  lng: number;
}

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
  community?: Community;
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

export interface ThanksData {
  fromUserId: string;
  toUserId: string;
  resourceId: string;
  message: string;
  imageUrls?: string[];
  impactDescription?: string;
}

export interface Thanks extends Omit<ThanksData, 'fromUserId' | 'toUserId' | 'resourceId'> {
  id: string;
  fromUser: User;
  toUser: User;
  resource: Resource;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThanksFilter {
  sentBy?: string;
  receivedBy?: string;
  resourceId?: string;
  page?: number;
  pageSize?: number;
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

export interface EventData {
  title: string;
  description: string;
  communityId: string;
  organizerId: string;
  startDateTime: Date;
  endDateTime?: Date;
  location: string;
  coordinates: Coordinates;
  parkingInfo?: string;
  maxAttendees?: number;
  registrationRequired?: boolean;
  isActive?: boolean;
  tags?: string[];
  imageUrls?: string[];
}

export interface Event extends Omit<EventData, 'communityId' | 'organizerId'> {
  id: string;
  community: Community;
  organizer: User;
  attendeeCount: number;
  registrationRequired: boolean;
  isActive: boolean;
  tags: string[];
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  // Optional current user's attendance status
  currentUserAttendance?: EventAttendance;
}

export interface EventFilter {
  communityId?: string;
  organizerId?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  tags?: string[];
  maxDriveMinutes?: number;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export enum EventAttendanceStatus {
  ATTENDING = 'attending',
  NOT_ATTENDING = 'not_attending',
  MAYBE = 'maybe'
}

export interface EventAttendanceData {
  eventId: string;
  userId: string;
  status: EventAttendanceStatus;
}

export interface EventAttendance extends EventAttendanceData {
  id: string;
  event: Event;
  user: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAttendanceFilter {
  eventId?: string;
  userId?: string;
  status?: EventAttendanceStatus;
  page?: number;
  pageSize?: number;
}

// Community Activity Feed Types
export enum ActivityType {
  RESOURCE_CREATED = 'resource_created',
  RESOURCE_UPDATED = 'resource_updated',
  EVENT_CREATED = 'event_created',
  EVENT_UPDATED = 'event_updated',
  THANKS_GIVEN = 'thanks_given',
  USER_JOINED = 'user_joined',
  COMMUNITY_CREATED = 'community_created'
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  communityId: string;
  actorId: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  // Assembled data
  community?: Community;
  actor: User;
  target?: Resource | Event | Thanks | User | Community;
}

export interface ActivityFeedFilter {
  communityId?: string;
  userId?: string;
  types?: ActivityType[];
  page?: number;
  pageSize?: number;
  since?: Date;
}