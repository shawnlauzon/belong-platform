export interface User extends UserData {
  created_at: Date;
  updated_at: Date;
}

// NewUser
export type NewUser = Omit<UserData, 'id'>;

// UpdateUser
export type UpdateUser = Pick<UserData, 'id'> & Partial<UserData>;

interface UserData {
  id: string;
  first_name: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  address?: string;
}

export interface AuthUser extends User {
  email: string;
  location?: Coordinates;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Membership extends MembershipData {
  user: User;
  community: Community;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  trust_score: TrustScore;
  community_tenure_months: number;
  thanks_received: number;
  resources_shared: number;
}

export interface TrustScore {
  score: number;
  thanks_received_count: number;
  thanks_given_count: number;
  resources_shared_count: number;
  community_tenure_days: number;
  last_calculated: string;
}

export type NewMembership = Omit<MembershipData, 'id'>;

interface MembershipData {
  user_id: string;
  community_id: string;
}

export interface Resource
  extends Omit<ResourceData, 'owner_id' | 'community_id'> {
  owner: User;
  community: Community;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  distance_minutes?: number; // Calculated field for driving time
}

// NewResource
export type NewResource = Omit<ResourceData, 'id'>;

// UpdateResource
export type UpdateResource = Pick<ResourceData, 'id'> & Partial<ResourceData>;

interface ResourceData {
  id: string;
  owner_id: string;
  community_id: string;
  type: 'offer' | 'request';
  category: ResourceCategory;
  title: string;
  description: string;
  image_urls: string[];
  location?: Coordinates;
  pickup_instructions?: string;
  parking_info?: string;
  meetup_flexibility: MeetupFlexibility;
  availability?: string;
  is_active: boolean;
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

export interface Thanks extends ThanksData {
  from_user: User;
  to_user: User;
  resource: Resource;
  created_at: Date;
  updated_at: Date;
}

// NewThanks
export type NewThanks = Omit<ThanksData, 'id'>;

// UpdateThanks
export type UpdateThanks = Pick<ThanksData, 'id'> & Partial<ThanksData>;

interface ThanksData {
  id: string;
  from_user_id: string;
  to_user_id: string;
  resource_id: string;
  message: string;
  image_urls: string[];
  impact_description?: string;
}

/**
 * Community
 */
export interface Community extends Omit<CommunityData, 'creator_id'> {
  name: string;
  creator: User;
  country: string;
  state?: string;
  city: string;
  neighborhood: string | null;
  member_count: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * New community data
 */
export type NewCommunity = Omit<CommunityData, 'id'>;

/**
 * Update community data
 */
export type UpdateCommunity = Pick<CommunityData, 'id'> &
  Partial<CommunityData>;

/**
 * Community data for updating
 */
interface CommunityData {
  id: string;
  name: string;
  description: string;
  center?: Coordinates;
  radius_km?: number;
  parent_id: string | null;
  creator_id: string;
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
  maxDriveMinutes?: number;
  searchTerm?: string;
  minTrustScore?: number;
}
