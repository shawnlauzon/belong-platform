import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { fetchResources, fetchResourceById } from '../impl/fetchResources';
import { createMockDbResource } from './test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
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
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('fetchResources', () => {
  const mockUser = createMockUser();
  const mockCommunity = createMockCommunity();
  const mockResources = Array(3).fill(null).map(() => createMockDbResource({
    owner_id: mockUser.id,
    community_id: mockCommunity.id,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    
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
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchResources();

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('resources');
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
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchResources(filters);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('resources');
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
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(fetchResources()).rejects.toThrow(mockError);
  });
});

describe('fetchResourceById', () => {
  const mockUser = createMockUser();
  const mockCommunity = createMockCommunity();
  const mockResource = createMockDbResource({
    owner_id: mockUser.id,
    community_id: mockCommunity.id,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
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
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchResourceById(mockResource.id);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('resources');
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
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

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
    
    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(fetchResourceById('some-id')).rejects.toThrow(mockError);
  });
});
