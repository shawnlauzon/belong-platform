export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  location?: Coordinates;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser extends User {
  // AuthUser extends User with any additional auth-specific fields if needed
  // Currently no additional fields, but this allows for future extension
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Membership {
  id: string;
  user_id: string;
  community_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  trust_score: number;
  community_tenure_months: number;
  thanks_received: number;
  resources_shared: number;
  user?: User;
  community?: Community;
}

export interface Resource {
  id: string;
  creator_id: string;
  owner?: User;
  type: 'offer' | 'request';
  category: 'tools' | 'skills' | 'food' | 'supplies' | 'other';
  title: string;
  description: string;
  image_urls: string[];
  location: Coordinates;
  pickup_instructions?: string;
  parking_info?: string;
  meetup_flexibility: 'home_only' | 'public_meetup_ok' | 'delivery_possible';
  availability?: string;
  is_active: boolean;
  times_helped: number;
  created_at: string;
  distance_minutes?: number; // Calculated field for driving time
}

export interface Thanks {
  id: string;
  from_user_id: string;
  from_user?: User;
  to_user_id: string;
  to_user?: User;
  resource_id: string;
  resource?: Resource;
  message: string;
  image_urls: string[];
  impact_description?: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  level: 'neighborhood' | 'city' | 'state' | 'country' | 'global';
  parent_id: string | null;
  center?: Coordinates;
  radius_km?: number;
  member_count: number;
  description: string;
}

export interface MeetupSpot {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export interface Event {
  id: string;
  community_id: string;
  title: string;
  date: string;
  location: string;
  parking: string;
  attendee_count: number;
  description: string;
}

export interface TrustScore {
  id: string;
  member_id: string;
  score: number;
  thanks_received_count: number;
  thanks_given_count: number;
  resources_shared_count: number;
  community_tenure_days: number;
  last_calculated: string;
}

export interface ResourceFilter {
  category?: 'tools' | 'skills' | 'food' | 'supplies' | 'other' | 'all';
  type?: 'offer' | 'request' | 'all';
  maxDriveMinutes?: number;
  searchTerm?: string;
  minTrustScore?: number;
}

export type SupabaseUser = import('@supabase/supabase-js').User;