import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { fetchCommunities } from '../impl/fetchCommunities';
import { createMockDbCommunity } from '../../test-utils/mocks';
import { supabase } from '@belongnetwork/core';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('fetchCommunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch communities successfully', async () => {
    // Arrange
    const mockCommunities = Array.from({ length: 3 }, () =>
      createMockDbCommunity()
    );

    // Mock the Supabase response
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockCommunities,
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchCommunities();

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('communities');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(result).toHaveLength(mockCommunities.length);
  });

  it('should throw an error when fetching communities fails', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch communities');
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(fetchCommunities()).rejects.toThrow(mockError);
  });
});
