import { User, Community, Resource, Thanks, Coordinates, ResourceFilter } from './entities';

// Auth State
export interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  error: string | null;
}

// Communities State
export interface CommunitiesState {
  list: Community[];
  currentId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Resources State
export interface ResourcesState {
  list: Resource[];
  currentId: string | null;
  filters: ResourceFilter;
  isLoading: boolean;
  error: string | null;
}

// Users State
export interface UsersState {
  current: User | null;
  profiles: Record<string, User>;
  isLoading: boolean;
  error: string | null;
}

// Thanks State
export interface ThanksState {
  list: Thanks[];
  isLoading: boolean;
  error: string | null;
}

// Main App State
export interface AppState {
  auth: AuthState;
  communities: CommunitiesState;
  resources: ResourcesState;
  users: UsersState;
  thanks: ThanksState;
}

export type BelongStore = AppState;
