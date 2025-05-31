export interface Member {
  id: string;
  name: string;
  avatar_url: string;
  trust_score: number;
  location: { lat: number; lng: number };
  community_tenure_months: number;
  thanks_received: number;
  resources_shared: number;
}

export interface Resource {
  id: string;
  member_id: string;
  owner: Member;
  type: 'offer' | 'request';
  category: 'tools' | 'skills' | 'food' | 'supplies' | 'other';
  title: string;
  description: string;
  image_urls: string[];
  location: { lat: number; lng: number };
  pickup_instructions: string;
  parking_info: string;
  meetup_flexibility: 'home_only' | 'public_meetup_ok' | 'delivery_possible';
  availability: string;
  is_active: boolean;
  times_helped: number;
  created_at: string;
}

export interface Thanks {
  id: string;
  from_member_id: string;
  from_member: Member;
  to_member_id: string;
  to_member: Member;
  resource_id: string;
  resource: Resource;
  message: string;
  image_urls: string[];
  impact_description: string;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  level: 'neighborhood' | 'city' | 'state' | 'country' | 'global';
  parent_id: string | null;
  center?: { lat: number; lng: number };
  radius_km?: number;
  member_count: number;
  description: string;
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

export interface MeetupSpot {
  name: string;
  lat: number;
  lng: number;
  type: string;
}