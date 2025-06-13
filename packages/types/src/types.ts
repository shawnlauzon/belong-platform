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

export interface CreateResourceData {
  type: 'offer' | 'request';
  category: ResourceCategory;
  title: string;
  description: string;
  image_urls?: string[];
  location?: { lat: number; lng: number };
  pickup_instructions?: string;
  parking_info?: string;
  meetup_flexibility?: MeetupFlexibility;
  availability?: string;
  is_active: boolean;
}

export interface UpdateResourceData extends Partial<CreateResourceData> {
  id: string;
}

export interface Resource extends CreateResourceData {
  id: string;
  owner: User;
  community: Community;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCommunityData {
  name: string;
  description: string;
  center?: { lat: number; lng: number };
  radius_km?: number;
  parent_id?: string;
}

export interface UpdateCommunityData extends Partial<CreateCommunityData> {
  id: string;
}

export interface Community extends CreateCommunityData {
  id: string;
  creator: User;
  country: string;
  state?: string;
  city: string;
  neighborhood?: string;
  member_count: number;
  created_at: Date;
  updated_at: Date;
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

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  location?: { lat: number; lng: number };
}

export interface User extends UpdateUserData {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthUser extends User {
  email: string;
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
  maxDriveMinutes?: number;
  searchTerm?: string;
  minTrustScore?: number;
}
