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
 * @param finalMethod - The method that resolves (defaults to 'is')
 */
export function setupChainableResourceQuery(
  mockSupabase: any,
  finalMethodResult: { data: any; error: any },
  finalMethod: string = 'is'
) {
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.is.mockReturnValue(finalMethodResult);
  
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
    deleted_at: null,
    deleted_by: null,
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
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(mockSupabase.is).toHaveBeenCalledWith('deleted_at', null);
  },

  /**
   * Asserts result array length
   */
  expectResultLength: (result: any[], expectedLength: number) => {
    expect(result).toHaveLength(expectedLength);
  },

  /**
   * Asserts only non-deleted resources in result
   */
  expectOnlyNonDeletedResources: (result: any[]) => {
    result.forEach(resource => {
      expect(resource.deletedAt).toBeUndefined();
    });
  },
};

/**
 * Test data generators with common patterns
 */
export const TestData = {
  /**
   * Non-deleted resource for testing fetch operations
   */
  activeResource: () =>
    createMockDbResource({
      id: 'resource-active',
      title: 'Active Resource',
      deleted_at: null,
      deleted_by: null,
    }),

  /**
   * Deleted resource for testing soft delete behavior
   */
  deletedResource: () =>
    createMockDbResource({
      id: 'resource-deleted', 
      title: 'Deleted Resource',
      deleted_at: new Date().toISOString(),
      deleted_by: 'user-admin',
    }),

  /**
   * Mixed active and deleted resources for testing filtering
   */
  mixedResources: () => [
    TestData.activeResource(),
    TestData.deletedResource(),
  ],
};