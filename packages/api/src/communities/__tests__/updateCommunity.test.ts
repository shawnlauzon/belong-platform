import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { updateCommunity } from '../impl/updateCommunity';
import { createMockDbCommunity, createMockCommunity } from '../../test-utils/mocks';
import { CommunityData } from '@belongnetwork/types';
import * as fetchCommunityById from '../impl/fetchCommunityById';
import { setupBelongClientMocks } from '../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('updateCommunity', () => {
  const mockUser = { id: faker.string.uuid() };
  const communityId = faker.string.uuid();
  const updateData = {
    id: communityId,
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    organizerId: faker.string.uuid(),
    parentId: null,
    hierarchyPath: [],
    level: 'city',
    memberCount: 0,
    timeZone: 'America/New_York',
  } as CommunityData & { id: string };

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
    // Mock fetchCommunityById
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(createMockCommunity());
  });

  it('should update a community successfully', async () => {
    // Arrange
    const mockCommunity = createMockCommunity({ id: communityId, name: updateData.name });
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);

    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await updateCommunity(updateData);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('communities');
    expect(mockQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: updateData.name,
        description: updateData.description,
        updated_by: mockUser.id,
      })
    );
    expect(mockQuery.eq).toHaveBeenCalledWith('id', communityId);
    expect(fetchCommunityById.fetchCommunityById).toHaveBeenCalledWith(communityId);
    expect(result).toBeDefined();
    expect(result.id).toBe(communityId);
    expect(result.name).toBe(updateData.name);
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    // Act & Assert
    await expect(updateCommunity(updateData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when update fails', async () => {
    // Arrange
    const mockError = new Error('Failed to update community');

    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(updateCommunity(updateData)).rejects.toThrow(mockError);
  });
});
