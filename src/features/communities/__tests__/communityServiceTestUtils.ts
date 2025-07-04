import { vi } from 'vitest';

/**
 * Community Service Test Utilities
 * Eliminates duplicate mock setup patterns in community.service.test.ts
 */

/**
 * Available query methods for building Supabase query mocks
 */
export type QueryMethod =
  | 'select'
  | 'eq'
  | 'is'
  | 'order'
  | 'single'
  | 'update'
  | 'insert'
  | 'delete';

/**
 * Creates a mock query builder with specified methods
 * All methods return `this` except the final resolving method
 *
 * @param methods - Array of query methods to include in the mock
 * @param finalMethod - The method that should resolve with data/error
 * @param resolveValue - The value to resolve with (defaults to { data: null, error: null })
 */
export function createMockQuery(
  methods: QueryMethod[],
  finalMethod: QueryMethod,
  resolveValue: { data: any; error: any } = { data: null, error: null }
) {
  const mockQuery: Record<string, any> = {};

  // Create chainable methods (return this)
  methods.forEach((method) => {
    if (method !== finalMethod) {
      mockQuery[method] = vi.fn().mockReturnThis();
    }
  });

  // Create the final resolving method
  mockQuery[finalMethod] = vi.fn().mockResolvedValue(resolveValue);

  return mockQuery;
}

/**
 * Sets up a complete mock query chain for Supabase
 *
 * @param mockSupabase - The mocked Supabase client
 * @param methods - Query methods to include
 * @param finalMethod - Method that resolves
 * @param resolveValue - Value to resolve with
 * @returns The created mock query object
 */
export function setupMockQuery(
  mockSupabase: any,
  methods: QueryMethod[],
  finalMethod: QueryMethod,
  resolveValue: { data: any; error: any } = { data: null, error: null }
) {
  const mockQuery = createMockQuery(methods, finalMethod, resolveValue);
  vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
  return mockQuery;
}

/**
 * Generates mock database community data with sensible defaults
 *
 * @param overrides - Properties to override in the mock community
 * @param baseUser - Base user object for organizer data
 * @returns Mock database community object
 */
export function createMockDbCommunity(
  overrides: Partial<any> = {},
  baseUser?: any
) {
  return {
    id: '1',
    name: 'Test Community',
    description: 'Test Description',
    level: 'city',
    organizer_id: baseUser?.id || 'user-123',
    parent_id: null,
    hierarchy_path: JSON.stringify([]),
    time_zone: 'UTC',
    member_count: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generates an array of mock database communities
 *
 * @param count - Number of communities to generate
 * @param baseUser - Base user for organizer data
 * @param overrides - Overrides applied to all communities
 * @returns Array of mock database communities
 */
export function createMockDbCommunities(
  count: number = 2,
  baseUser?: any,
  overrides: Partial<any> = {}
) {
  return Array.from({ length: count }, (_, index) =>
    createMockDbCommunity(
      {
        id: `${index + 1}`,
        name: `Community ${index + 1}`,
        description: `Description ${index + 1}`,
        ...overrides,
      },
      baseUser
    )
  );
}

/**
 * Common assertion patterns for community service tests
 */
export const CommunityServiceAssertions = {
  /**
   * Asserts result array length
   */
  expectResultLength: (result: any[], expectedLength: number) => {
    expect(result).toHaveLength(expectedLength);
  },

  /**
   * Asserts authentication check was called
   */
  expectAuthenticationCheck: (mockSupabase: any) => {
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  },
};

/**
 * Pre-configured query setups for common test scenarios
 */
export const QuerySetups = {
  /**
   * Standard fetchCommunities query (select, order, is) - is resolves last for soft deletion
   */
  fetchCommunities: (mockSupabase: any, data: any[] = [], error: any = null) =>
    setupMockQuery(mockSupabase, ['select', 'order', 'is'], 'is', {
      data,
      error,
    }),

  /**
   * FetchCommunities with different ordering (select, eq, order) - order resolves last
   */
  fetchCommunitiesOrderLast: (
    mockSupabase: any,
    data: any[] = [],
    error: any = null
  ) =>
    setupMockQuery(mockSupabase, ['select', 'eq', 'order'], 'order', {
      data,
      error,
    }),

  /**
   * FetchCommunityById query (select, eq, single)
   */
  fetchCommunityById: (
    mockSupabase: any,
    data: any = null,
    error: any = null
  ) =>
    setupMockQuery(mockSupabase, ['select', 'eq', 'single'], 'single', {
      data,
      error,
    }),

  /**
   * Create community query (insert, select, single)
   */
  createCommunity: (mockSupabase: any, data: any = null, error: any = null) =>
    setupMockQuery(mockSupabase, ['insert', 'select', 'single'], 'single', {
      data,
      error,
    }),

  /**
   * Update community query (update, eq, select, single)
   */
  updateCommunity: (mockSupabase: any, data: any = null, error: any = null) =>
    setupMockQuery(mockSupabase, ['update', 'eq', 'select', 'single'], 'single', { data, error }),
};

/**
 * Authentication mock helpers
 */
export const AuthMocks = {
  /**
   * Mock authenticated user
   */
  authenticatedUser: (mockSupabase: any, userId: string) => {
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  },

  /**
   * Mock unauthenticated user
   */
  unauthenticatedUser: (mockSupabase: any) => {
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });
  },
};

/**
 * Test data generators with common patterns
 */
export const TestData = {
  /**
   * Active community for testing fetch operations
   */
  activeCommunity: (baseUser?: any) =>
    createMockDbCommunity(
      {
        id: 'active-community',
        name: 'Active Community',
        is_active: true,
      },
      baseUser
    ),

  /**
   * Community data for creation/update operations
   */
  communityCreationData: () => ({
    name: 'New Community',
    description: 'Community description',
    level: 'city',
    organizerId: 'user-123',
    parentId: null,
    hierarchyPath: [],
    timeZone: 'UTC',
  }),
};
