import type { BelongState } from '../types/store';

export const initialState: BelongState = {
  auth: {
    user: null,
    session: null,
    isLoading: false,
    error: null,
  },
  profile: {
    // Profile data
    id: '',
    first_name: '',
    last_name: '',
    avatar_url: '',
    bio: '',
    location: { lat: 0, lng: 0 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    // UI state
    isLoading: false,
    isUpdating: false,
    error: null,
  },
  community: {
    currentCommunity: null,
    communities: {},
    isLoading: false,
    error: null,
  },
  resource: {
    resources: {},
    currentResource: null,
    isLoading: false,
    error: null,
  },
  thank: {
    thanks: {},
    isLoading: false,
    error: null,
  },
};
