import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createCommunity } from '../impl/createCommunity';
import { createMockDbCommunity, createMockDbProfile } from '../../test-utils/mocks';
import { CommunityData } from '@belongnetwork/types';
import { forDbInsert } from '../impl/communityTransformer';
import { setupBelongClientMocks } from '../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('createCommunity', () => {
  const mockUser = { id: faker.string.uuid() };
  const communityData = {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
  } as CommunityData;

  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    mockLogger = mocks.mockLogger;
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  it('should create a community successfully', async () => {
    // Arrange
    const mockCommunityId = faker.string.uuid();
    const mockCommunityWithOrganizer = {
      ...createMockDbCommunity({ ...communityData, id: mockCommunityId }),
      organizer: createMockDbProfile(),
    };

    // Mock insert query (returns just ID)
    const mockInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: mockCommunityId },
        error: null,
      }),
    };

    // Mock fetch query (returns community with organizer)
    const mockFetchQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCommunityWithOrganizer,
        error: null,
      }),
    };

    // Return different mocks based on call order
    mockSupabase.from
      .mockReturnValueOnce(mockInsertQuery as any)  // First call: insert
      .mockReturnValueOnce(mockFetchQuery as any);  // Second call: fetch

    // Act
    const result = await createCommunity(communityData);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('communities');
    expect(mockInsertQuery.insert).toHaveBeenCalledWith(forDbInsert(communityData));
    expect(mockInsertQuery.select).toHaveBeenCalledWith('id');
    expect(result).toBeDefined();
    expect(result.name).toBe(communityData.name);
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    // Act & Assert
    await expect(createCommunity(communityData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when creation fails', async () => {
    // Arrange
    const mockError = new Error('Failed to create community');

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(createCommunity(communityData)).rejects.toThrow(mockError);
  });
});
