import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { deleteCommunity } from '../impl/deleteCommunity';
import { setupBelongClientMocks } from '../../test-utils/mockSetup';
import { createMockCommunity } from '../../test-utils/mocks';
import * as fetchCommunityById from '../impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('deleteCommunity', () => {
  const mockUser = { id: faker.string.uuid() };
  const differentUser = { id: faker.string.uuid() };
  const communityId = faker.string.uuid();
  const mockCommunity = createMockCommunity({ 
    id: communityId,
    organizer: mockUser as any,
    isActive: false,
    deletedAt: new Date(),
    deletedBy: mockUser.id,
  });

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

    // Mock fetchCommunityById to return the soft deleted community
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);

    // Mock successful soft delete (authorization check + update)
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Authorization check
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organizer_id: mockUser.id, is_active: true },
            error: null,
          }),
        };
      } else {
        // Update query
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        };
      }
    });
  });

  it('should soft delete a community successfully when user is organizer', async () => {
    // Act
    const result = await deleteCommunity(communityId);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('communities');
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(result).toEqual(mockCommunity);
    expect(fetchCommunityById.fetchCommunityById).toHaveBeenCalledWith(communityId, { includeDeleted: true });
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    // Act & Assert
    await expect(deleteCommunity(communityId)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when user is not the organizer', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: differentUser },
    });
    
    // Mock authorization check to return community with different organizer
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { organizer_id: mockUser.id, is_active: true }, // Different from authenticated user
        error: null,
      }),
    });

    // Act & Assert
    await expect(deleteCommunity(communityId)).rejects.toThrow(
      'Only community organizers can delete communities'
    );
  });

  it('should throw an error when community is not found', async () => {
    // Arrange
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    // Act & Assert
    await expect(deleteCommunity(communityId)).rejects.toThrow(
      'Community not found'
    );
  });

  it('should throw an error when soft delete update fails', async () => {
    // Arrange
    const mockError = new Error('Failed to soft delete community');

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Authorization check - success
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organizer_id: mockUser.id, is_active: true },
            error: null,
          }),
        };
      } else {
        // Update query - failure
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            error: mockError,
          }),
        };
      }
    });

    // Act & Assert
    await expect(deleteCommunity(communityId)).rejects.toThrow(mockError);
  });
});