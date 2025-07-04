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
  mockSupabase.order.mockReturnValue(finalMethodResult);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  
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
   * Active resource for testing fetch operations
   */
  activeResource: () =>
    createMockDbResource({
      id: 'resource-active',
      title: 'Active Resource',
    }),
};