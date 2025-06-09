import {
  User,
  Community,
  Resource,
  Thanks,
  Coordinates,
  ResourceFilter,
  Me,
} from '../types/entities';

// App State
export interface AppState {
  viewMode: 'member' | 'organizer';
}

// Auth State
export interface AuthState {
  user: Me | null;
  session: any | null;
  location: Coordinates | null;
  isLoading: boolean;
  error: string | null;
}

// Communities State
export interface CommunitiesState {
  list: Community[];
  activeId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Resources State
export interface ResourcesState {
  list: Resource[];
  activeId: string | null;
  filters: ResourceFilter;
  isLoading: boolean;
  error: string | null;
}

// Users State
export interface UsersState {
  list: User[];
  activeId: string | null;
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
export interface BelongState {
  app: AppState;
  auth: AuthState;
  communities: CommunitiesState;
  resources: ResourcesState;
  users: UsersState;
  thanks: ThanksState;
}

// Store Actions - these only emit events
export interface StoreActions {
  // Community actions
  setActiveCommunity: (communityId: string) => void;

  // Auth actions
  signIn: (email: string, password: string) => void;
  signUp: (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => void;
  signOut: () => void;

  // Add other action types here as needed
}

// The complete store type
export interface BelongStore extends BelongState, StoreActions {
  // Selectors
  getActiveCommunity: () => Community | null;
  setViewMode: (mode: 'member' | 'organizer') => void;
}
