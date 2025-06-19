import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCommunities } from '../impl/fetchCommunities';
import { createMockDbCommunity, createMockDbProfile } from '../../test-utils/mocks';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

import { getBelongClient } from '@belongnetwork/core';
const mockGetBelongClient = vi.mocked(getBelongClient);

describe('fetchCommunities', () => {
  let mockSupabase: any;
  let mockLogger: any;

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
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    // Setup mock to return our mock client
    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase,
      logger: mockLogger,
      mapbox: {} as any,
    });
  });

  it.skip('should fetch communities successfully', async () => {
    // Arrange
    const mockCommunities = Array.from({ length: 3 }, () => ({
      ...createMockDbCommunity(),
      organizer: createMockDbProfile(),
      parent: null
    }));

    // Mock the Supabase response
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockCommunities,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    // Act
    const result = await fetchCommunities();

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('communities');
    expect(mockQuery.select).toHaveBeenCalledWith(expect.any(String));
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(result).toHaveLength(mockCommunities.length);
  });

  it.skip('should throw an error when fetching communities fails', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch communities');
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    // Act & Assert
    await expect(fetchCommunities()).rejects.toThrow(mockError);
  });
});
