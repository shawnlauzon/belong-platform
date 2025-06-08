import { User, Community, Resource, Thanks, Coordinates } from './entities';

// Extended types with additional UI state
export interface ProfileState {
  // Profile data
  id: string;
  email?: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  bio: string;
  location: Coordinates;
  created_at: string;
  updated_at: string;

  // UI state
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  error: string | null;
}

export interface ResourceState {
  resources: Record<string, Resource>;
  currentResource: Resource | null;
  isLoading: boolean;
  error: string | null;
}

export interface CommunityState {
  currentCommunity: Community | null;
  communities: Record<string, Community>;
  isLoading: boolean;
  error: string | null;
}

export interface ThankState {
  thanks: Record<string, Thanks>;
  isLoading: boolean;
  error: string | null;
}

// Store state interface
export interface BelongState {
  auth: AuthState;
  profile: ProfileState;
  community: CommunityState;
  resource: ResourceState;
  thank: ThankState;
}

export type BelongStore = BelongState;
