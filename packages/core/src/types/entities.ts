export interface User extends UserData {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface UserData {
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
  id: string;
  user: User;
  community: Community;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  trust_score: number;
  community_tenure_months: number;
  thanks_received: number;
  resources_shared: number;
}

export interface MembershipData {
  id: string;
  user_id: string;
  community_id: string;
}

export interface Resource extends ResourceData {
  id: string;
  owner: User;
  is_active: boolean;
  times_helped: number;
  created_at: string;
  updated_at: string;
  distance_minutes?: number; // Calculated field for driving time
}

export interface ResourceData {
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
}

export interface Thanks extends ThanksData {
  id: string;
  from_user: User;
  to_user: User;
  resource: Resource;
  created_at: string;
  updated_at: string;
}

export interface ThanksData {
  from_user_id: string;
  to_user_id: string;
  resource_id: string;
  message: string;
  image_urls: string[];
  impact_description?: string;
}

export interface Community extends CommunityData {
  id: string;
  name: string;
  member_count: number;
}

export interface CommunityData {
  name: string;
  country: string;
  state?: string;
  city: string;
  neighborhood?: string;
  description: string;
  center?: Coordinates;
}

export interface MeetupSpot {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export interface Event extends EventData {
  id: string;
  community: Community;
  attendee_count: number;
}

export interface EventData {
  community_id: string;
  title: string;
  date: string;
  location: string;
  parking: string;
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
