import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { fetchResources, fetchResourceById } from '../impl/fetchResources';
import { createMockDbResource } from '../../test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

import { getBelongClient } from '@belongnetwork/core';
const mockGetBelongClient = vi.mocked(getBelongClient);

describe('fetchResources', () => {
  let mockSupabase: any;
  let mockLogger: any;
  const mockUser = createMockUser();
  const mockCommunity = createMockCommunity();
  const mockResources = Array(3).fill(null).map(() => createMockDbResource({
    owner_id: mockUser.id,
    community_id: mockCommunity.id,
  }));

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      trace: vi.fn(),
    };

    // Create mock supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: faker.string.uuid() } },
        }),
      },
    };

    // Setup mock to return our mock client
    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase,
      logger: mockLogger,
      mapbox: {} as any,
    });
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  it('should fetch all resources', async () => {
    // Arrange
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockResources,
        error: null,
      }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchResources();

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('resources');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(mockResources[0].id);
    expect(result[0].owner).toEqual(mockUser);
    expect(result[0].community).toEqual(mockCommunity);
  });

  it('should apply filters when provided', async () => {
    // Arrange
    const filters = {
      communityId: mockCommunity.id,
      category: 'food' as const,
      isActive: true,
    };

    const filteredResources = mockResources.filter(r => 
      r.community_id === filters.communityId && 
      r.category === filters.category &&
      r.is_active === filters.isActive
    );

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    
    // Chain the eq calls and return the filtered data at the end
    mockQuery.eq = vi.fn((key, value) => {
      if (key === 'is_active') {
        return {
          data: filteredResources,
          error: null,
        };
      }
      return mockQuery;
    });
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchResources(filters);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('resources');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(result).toHaveLength(filteredResources.length);
  });

  it('should throw an error when fetching resources fails', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch resources');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(fetchResources()).rejects.toThrow(mockError);
  });
});

describe('fetchResourceById', () => {
  let mockSupabase: any;
  let mockLogger: any;
  const mockUser = createMockUser();
  const mockCommunity = createMockCommunity();
  const mockResource = createMockDbResource({
    owner_id: mockUser.id,
    community_id: mockCommunity.id,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      trace: vi.fn(),
    };

    // Create mock supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: faker.string.uuid() } },
        }),
      },
    };

    // Setup mock to return our mock client
    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase,
      logger: mockLogger,
      mapbox: {} as any,
    });
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  it('should fetch a resource by ID', async () => {
    // Arrange
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockResource,
        error: null,
      }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchResourceById(mockResource.id);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('resources');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(mockQuery.eq).toHaveBeenCalledWith('id', mockResource.id);
    expect(mockQuery.single).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ 
      id: mockResource.id,
      owner: mockUser,
      community: mockCommunity,
    }));
  });

  it('should return null when resource is not found', async () => {
    // Arrange
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error code
      }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchResourceById('non-existent-id');

    // Assert
    expect(result).toBeNull();
  });

  it('should throw an error when fetching fails', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch resource');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(fetchResourceById('some-id')).rejects.toThrow(mockError);
  });
});
