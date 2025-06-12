// Re-export all types from core package for now
export * from '@belongnetwork/core/types';

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
  category: string;
  title: string;
  description: string;
  image_urls?: string[];
  location?: { lat: number; lng: number };
  pickup_instructions?: string;
  parking_info?: string;
  meetup_flexibility?: string;
  availability?: string;
}

export interface UpdateResourceData extends Partial<CreateResourceData> {
  id: string;
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

export interface CreateThanksData {
  to_user_id: string;
  resource_id: string;
  message: string;
  image_urls?: string[];
  impact_description?: string;
}

export interface UpdateThanksData extends Partial<CreateThanksData> {
  id: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  location?: { lat: number; lng: number };
}