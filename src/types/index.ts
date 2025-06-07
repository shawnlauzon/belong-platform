export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  location: Coordinates;
  current_community_id: string;
  is_organizer: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ProfileMetadata {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  location?: Coordinates;
  address?: string;
  address_bbox?: [number, number, number, number];
}

export interface Resource {
  id: string;
  creator_id: string;
  owner?: Member;
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

export interface Member {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  trust_score: number;
  location: Coordinates;
  community_tenure_months: number;
  thanks_received: number;
  resources_shared: number;
  created_at: string;
}

export interface Thanks {
  id: string;
  from_member_id: string;
  from_member?: Member;
  to_member_id: string;
  to_member?: Member;
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