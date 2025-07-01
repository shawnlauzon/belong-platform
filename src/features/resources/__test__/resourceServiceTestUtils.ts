import { vi } from 'vitest';

/**
 * Resource Service Test Utilities
 * Eliminates duplicate mock setup patterns in resource.service.test.ts
 */

/**
 * Sets up the chainable mockSupabase object for resource queries
 * Uses the pattern where mockSupabase itself is the chainable object
 * 
 * @param mockSupabase - The mock Supabase client object
 * @param finalMethodResult - Result to return from the final method
 * @param finalMethod - The method that resolves (defaults to 'order')
 */
export function setupChainableResourceQuery(
  mockSupabase: any,
  finalMethodResult: { data: any; error: any },
  finalMethod: string = 'order'
) {
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase[finalMethod].mockReturnValue(finalMethodResult);
  
  return mockSupabase;
}

/**
 * Generates mock database resource data with sensible defaults
 * 
 * @param overrides - Properties to override in the mock resource
 * @returns Mock database resource object
 */
export function createMockDbResource(overrides: Partial<any> = {}) {
  return {
    id: 'resource-1',
    type: 'offer',
    category: 'tools',
    title: 'Test Resource',
    description: 'Test Description',
    owner_id: 'user-1',
    community_id: 'community-1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generates an array of mock database resources
 * 
 * @param count - Number of resources to generate
 * @param overrides - Overrides applied to all resources
 * @returns Array of mock database resources
 */
export function createMockDbResources(
  count: number = 2,
  overrides: Partial<any> = {}
) {
  return Array.from({ length: count }, (_, index) =>
    createMockDbResource({
      id: `resource-${index + 1}`,
      title: `Resource ${index + 1}`,
      description: `Description ${index + 1}`,
      ...overrides,
    })
  );
}

/**
 * Common assertion patterns for resource service tests
 */
export const ResourceServiceAssertions = {
  /**
   * Asserts standard fetchResources query pattern
   */
  expectFetchResourcesQuery: (mockSupabase: any) => {
    expect(mockSupabase.from).toHaveBeenCalledWith('resources');
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  },

  /**
   * Asserts result array length
   */
  expectResultLength: (result: any[], expectedLength: number) => {
    expect(result).toHaveLength(expectedLength);
  },

  /**
   * Asserts only active resources in result
   */
  expectOnlyActiveResources: (result: any[]) => {
    result.forEach(resource => {
      expect(resource.is_active).toBe(true);
    });
  },
};

/**
 * Test data generators with common patterns
 */
export const TestData = {
  /**
   * Active resource for testing fetch operations
   */
  activeResource: () =>
    createMockDbResource({
      id: 'resource-active',
      title: 'Active Resource',
      is_active: true,
    }),

  /**
   * Inactive resource for testing soft delete behavior
   */
  inactiveResource: () =>
    createMockDbResource({
      id: 'resource-inactive', 
      title: 'Inactive Resource',
      is_active: false,
    }),

  /**
   * Mixed active and inactive resources for testing filtering
   */
  mixedResources: () => [
    TestData.activeResource(),
    TestData.inactiveResource(),
  ],
};