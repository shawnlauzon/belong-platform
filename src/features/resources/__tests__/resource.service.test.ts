import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createResourceService } from '../services/resource.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import {
  setupChainableResourceQuery,
  createMockDbResources,
  ResourceServiceAssertions,
  TestData,
} from '../__tests__/resourceServiceTestUtils';

// Mock the logger
vi.mock('../../../shared', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Resource Service - Soft Delete Bug Fix', () => {
  let mockSupabase: any;
  let resourceService: ReturnType<typeof createResourceService>;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    } as any;

    resourceService = createResourceService(
      mockSupabase as SupabaseClient<Database>
    );
    vi.clearAllMocks();
  });

  it('should only return active resources by default (service-level bug test)', async () => {
    // Arrange: Mock database returns mix of active and inactive resources
    const mockDbResources = TestData.mixedResources();
    setupChainableResourceQuery(mockSupabase, {
      data: mockDbResources,
      error: null,
    });

    // Act: Call fetchResources with no filters (should default to active only)
    const result = await resourceService.fetchResources();

    // Assert: Should only return non-deleted resources due to soft deletion filtering
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('resource-active');

    // Verify inactive resource was filtered out
    const inactiveResource = result.find((r) => r.id === 'resource-inactive');
    expect(inactiveResource).toBeUndefined();
  });

  it('should allow explicit inactive filtering when requested', async () => {
    // Arrange: Mock returns inactive resources when explicitly requested
    const mockInactiveResources = [
      {
        id: 'resource-inactive',
        type: 'offer',
        category: 'tools',
        title: 'Inactive Resource',
        description: 'This should appear when requested',
        owner_id: 'user-1',
        community_id: 'community-1',
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.is.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue({
      data: mockInactiveResources,
      error: null,
    });

    // Act: Explicitly request including deleted resources
    const result = await resourceService.fetchResources({ includeDeleted: true });

    // Assert: Should include deleted resources when explicitly requested
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('resource-inactive');
  });
});

describe('fetchResourceById', () => {
  let mockSupabase: any;
  let resourceService: ReturnType<typeof createResourceService>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    } as any;
    resourceService = createResourceService(
      mockSupabase as SupabaseClient<Database>
    );
  });

  it('should handle missing user data gracefully', async () => {
    // Arrange: Mock resource data that exists
    const mockResourceData = {
      id: 'resource-1',
      type: 'offer',
      category: 'tools',
      title: 'Test Resource',
      description: 'Test description',
      owner_id: 'user-1',
      community_id: 'community-1',
      deleted_at: null,
      deleted_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock the resource query to succeed
    const mockResourceQuery = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockResourceData,
        error: null,
      }),
    };

    // Mock the user/community queries to return null (user not found)
    const mockUserQuery = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    };

    // Set up the mock to return different responses for different tables
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'resources') {
        return mockResourceQuery;
      } else if (table === 'profiles' || table === 'communities') {
        return mockUserQuery;
      }
      return mockSupabase;
    });

    // Act & Assert: Call should fail when user is not found
    await expect(
      resourceService.fetchResourceById('resource-1')
    ).rejects.toThrow('Owner not found');
  });
});
