import { vi } from 'vitest';

/**
 * Event Service Test Utilities
 * Eliminates duplicate mock setup patterns in event.service.test.ts
 */

/**
 * Available query methods for building Supabase query mocks
 */
export type QueryMethod = 
  | 'select' 
  | 'eq' 
  | 'is'
  | 'order' 
  | 'gte' 
  | 'lte' 
  | 'or' 
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
 * 
 * @example
 * ```typescript
 * const mockQuery = createMockQuery(['select', 'eq', 'order'], 'order', {
 *   data: mockEvents,
 *   error: null
 * });
 * ```
 */
export function createMockQuery(
  methods: QueryMethod[],
  finalMethod: QueryMethod,
  resolveValue: { data: any; error: any } = { data: null, error: null }
) {
  const mockQuery: Record<string, any> = {};
  
  // Create chainable methods (return this)
  methods.forEach(method => {
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
 * 
 * @example
 * ```typescript
 * const mockQuery = setupMockQuery(mockSupabase, ['select', 'eq', 'order'], 'order', {
 *   data: mockEvents,
 *   error: null
 * });
 * ```
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
 * Creates a mock query with chained eq calls (common pattern in filters)
 * First eq call returns this, second eq call resolves
 * 
 * @param mockSupabase - The mocked Supabase client
 * @param resolveValue - Value for the final resolution
 * @returns The created mock query object
 */
export function setupMockQueryWithChainedEq(
  mockSupabase: any,
  resolveValue: { data: any; error: any } = { data: null, error: null }
) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn(),
  };

  // First eq call returns this, second eq call resolves
  mockQuery.eq
    .mockReturnValueOnce(mockQuery)
    .mockResolvedValue(resolveValue);

  vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
  return mockQuery;
}

/**
 * Generates mock database event data with sensible defaults
 * 
 * @param overrides - Properties to override in the mock event
 * @param baseUser - Base user object for organizer_id
 * @param baseCommunity - Base community object for community_id
 * @returns Mock database event object
 */
export function createMockDbEvent(
  overrides: Partial<any> = {},
  baseUser?: any,
  baseCommunity?: any
) {
  return {
    id: '1',
    title: 'Test Event',
    description: 'Test Description',
    start_date_time: new Date().toISOString(),
    organizer_id: baseUser?.id || 'user-123',
    community_id: baseCommunity?.id || 'community-123',
    deleted_at: null,
    deleted_by: null,
    tags: ['test'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generates an array of mock database events
 * 
 * @param count - Number of events to generate
 * @param baseUser - Base user for organizer_id
 * @param baseCommunity - Base community for community_id
 * @param overrides - Overrides applied to all events
 * @returns Array of mock database events
 */
export function createMockDbEvents(
  count: number = 2,
  baseUser?: any,
  baseCommunity?: any,
  overrides: Partial<any> = {}
) {
  return Array.from({ length: count }, (_, index) =>
    createMockDbEvent(
      {
        id: `${index + 1}`,
        title: `Event ${index + 1}`,
        description: `Description ${index + 1}`,
        tags: [`tag${index + 1}`],
        ...overrides,
      },
      baseUser,
      baseCommunity
    )
  );
}

/**
 * Common assertion patterns for event service tests
 */
export const EventServiceAssertions = {
  /**
   * Asserts standard fetchEvents query pattern with soft deletion
   */
  expectFetchEventsQuery: (mockSupabase: any, mockQuery: any) => {
    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(mockQuery.order).toHaveBeenCalledWith('start_date_time', {
      ascending: true,
    });
    expect(mockQuery.is).toHaveBeenCalledWith('deleted_at', null);
  },

  /**
   * Asserts community filter was applied
   */
  expectCommunityFilter: (mockQuery: any, communityId: string) => {
    expect(mockQuery.eq).toHaveBeenCalledWith('community_id', communityId);
  },

  /**
   * Asserts organizer filter was applied  
   */
  expectOrganizerFilter: (mockQuery: any, organizerId: string) => {
    expect(mockQuery.eq).toHaveBeenCalledWith('organizer_id', organizerId);
  },

  /**
   * Asserts date range filters were applied
   */
  expectDateRangeFilter: (mockQuery: any, startDate: Date, endDate: Date) => {
    expect(mockQuery.gte).toHaveBeenCalledWith(
      'start_date_time',
      startDate.toISOString()
    );
    expect(mockQuery.lte).toHaveBeenCalledWith(
      'start_date_time',
      endDate.toISOString()
    );
  },

  /**
   * Asserts search filter was applied
   */
  expectSearchFilter: (mockQuery: any, searchTerm: string) => {
    expect(mockQuery.or).toHaveBeenCalledWith(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
    );
  },

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
   * Standard fetchEvents query (select, order, is) - is resolves last for soft deletion
   */
  fetchEvents: (mockSupabase: any, data: any[] = [], error: any = null) =>
    setupMockQuery(
      mockSupabase,
      ['select', 'order', 'is'],
      'is',
      { data, error }
    ),

  /**
   * FetchEvents with community/organizer filter (select, order, is, eq) - eq resolves last for filtering
   */
  fetchEventsWithFilter: (mockSupabase: any, data: any[] = [], error: any = null) =>
    setupMockQuery(
      mockSupabase,
      ['select', 'order', 'is', 'eq'],
      'eq',
      { data, error }
    ),

  /**
   * FetchEvents with date range (select, order, is, gte, lte) - lte resolves last
   */
  fetchEventsWithDateRange: (mockSupabase: any, data: any[] = [], error: any = null) =>
    setupMockQuery(
      mockSupabase,
      ['select', 'order', 'is', 'gte', 'lte'],
      'lte',
      { data, error }
    ),

  /**
   * FetchEvents with search (select, order, is, or) - or resolves last
   */
  fetchEventsWithSearch: (mockSupabase: any, data: any[] = [], error: any = null) =>
    setupMockQuery(
      mockSupabase,
      ['select', 'order', 'is', 'or'],
      'or',
      { data, error }
    ),

  /**
   * FetchEventById query (select, eq, is, single) - single resolves last
   */
  fetchEventById: (mockSupabase: any, data: any = null, error: any = null) =>
    setupMockQuery(
      mockSupabase,
      ['select', 'eq', 'is', 'single'],
      'single',
      { data, error }
    ),

  /**
   * Update event query (update, eq, select, single)
   */
  updateEvent: (mockSupabase: any, data: any = null, error: any = null) =>
    setupMockQuery(
      mockSupabase,
      ['update', 'eq', 'select', 'single'],
      'single',
      { data, error }
    ),
};

/**
 * Test data generators with common patterns
 */
export const TestData = {
  /**
   * Active event for testing fetchEvents
   */
  activeEvent: (baseUser?: any, baseCommunity?: any) =>
    createMockDbEvent(
      {
        id: 'active-event',
        title: 'Active Event',
        deleted_at: null,
        deleted_by: null,
      },
      baseUser,
      baseCommunity
    ),

  /**
   * Inactive event for testing soft delete behavior
   */
  inactiveEvent: (baseUser?: any, baseCommunity?: any) =>
    createMockDbEvent(
      {
        id: 'inactive-event',
        title: 'Inactive Event',
        deleted_at: '2024-01-01T00:00:00Z',
        deleted_by: 'admin-123',
      },
      baseUser,
      baseCommunity
    ),

  /**
   * Event data for creation/update operations
   */
  eventCreationData: () => ({
    title: 'New Event',
    description: 'Event description',
    startDateTime: new Date(),
    endDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
    location: 'Test Location',
    organizerId: 'user-123',
    communityId: 'community-123',
    tags: ['test', 'event'],
  }),
};