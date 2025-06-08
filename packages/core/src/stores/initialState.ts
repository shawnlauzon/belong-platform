import type { AppState } from '../types/store';

export const initialState: AppState = {
  // Auth state
  auth: {
    user: null,
    session: null,
    isLoading: false,
    error: null,
  },
  
  // Communities state
  communities: {
    list: [],
    currentId: null,
    isLoading: false,
    error: null,
  },
  
  // Resources state
  resources: {
    list: [],
    currentId: null,
    filters: {
      category: 'all',
      type: 'all',
      searchTerm: '',
    },
    isLoading: false,
    error: null,
  },
  
  // Users state
  users: {
    current: null,
    profiles: {},
    isLoading: false,
    error: null,
  },
  
  // Thanks state
  thanks: {
    list: [],
    isLoading: false,
    error: null,
  },
};
