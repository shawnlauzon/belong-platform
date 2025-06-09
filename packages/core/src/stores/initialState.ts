import type { BelongState } from './types';

export const initialState: BelongState = {
  app: {
    viewMode: 'member',
  },
  // Auth state
  auth: {
    user: null,
    session: null,
    location: null,
    isLoading: false,
    error: null,
  },

  // Communities state
  communities: {
    list: [],
    activeId: null,
    isLoading: false,
    error: null,
  },

  // Resources state
  resources: {
    list: [],
    activeId: null,
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
    list: [],
    activeId: null,
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
