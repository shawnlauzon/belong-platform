import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { fetchCommunityById } from '../impl/fetchCommunityById';
import { createMockDbCommunity, createMockDbProfile } from '../../test-utils/mocks';
import { setupBelongClientMocks } from '../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('fetchCommunityById', () => {
  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    mockLogger = mocks.mockLogger;
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

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchCommunityById(communityId);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('communities');
    expect(mockQuery.select).toHaveBeenCalled();
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

    mockSupabase.from.mockReturnValue(mockQuery as any);

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

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(fetchCommunityById(communityId)).rejects.toThrow(mockError);
  });
});
