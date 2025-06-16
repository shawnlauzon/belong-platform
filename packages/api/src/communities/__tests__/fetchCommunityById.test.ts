import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { fetchCommunityById } from '../impl/fetchCommunityById';
import { createMockDbCommunity, createMockDbProfile } from '../../test-utils/mocks';
import { supabase } from '@belongnetwork/core';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('fetchCommunityById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch a community by id successfully', async () => {
    // Arrange
    const communityId = faker.string.uuid();
    const mockCommunity = {
      ...createMockDbCommunity({ id: communityId }),
      organizer: createMockDbProfile(),
      parent: null
    };

    // Mock the Supabase response
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCommunity,
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchCommunityById(communityId);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('communities');
    expect(mockQuery.select).toHaveBeenCalledWith('*, organizer:profiles!inner(*), parent:communities(*, organizer:profiles(*))');
    expect(mockQuery.eq).toHaveBeenCalledWith('id', communityId);
    expect(result).toBeDefined();
    expect(result?.id).toBe(communityId);
  });

  it('should return null when community is not found', async () => {
    // Arrange
    const communityId = faker.string.uuid();
    const notFoundError = { code: 'PGRST116' };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: notFoundError,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchCommunityById(communityId);

    // Assert
    expect(result).toBeNull();
  });

  it('should throw an error when fetching fails', async () => {
    // Arrange
    const communityId = faker.string.uuid();
    const mockError = new Error('Failed to fetch community');

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
    await expect(fetchCommunityById(communityId)).rejects.toThrow(mockError);
  });
});
