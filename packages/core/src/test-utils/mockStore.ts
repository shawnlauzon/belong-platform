import { BelongState } from 'src/stores/types';

// Setup default store mock
export function createMockStore(
  overrides: Partial<BelongState> = {}
): BelongState {
  return {
    app: {
      viewMode: 'member',
      activeCommunityId: null,
    },
    auth: {
      user: null,
      session: null,
      location: null,
      isAuthenticated: false,
      token: null,
      isLoading: false,
      error: null,
    },
    users: {
      list: [],
      isLoading: false,
      error: null,
      activeId: null,
    },
    communities: {
      list: [],
      isLoading: false,
      error: null,
    },
    resources: {
      list: [],
      isLoading: false,
      error: null,
      filters: {
        category: 'all',
        type: 'all',
        searchTerm: '',
      },
      activeId: null,
    },
    thanks: {
      list: [],
      isLoading: false,
      error: null,
    },
    ...overrides,
  };
}
