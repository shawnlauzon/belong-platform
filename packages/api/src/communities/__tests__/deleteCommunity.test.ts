import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { deleteCommunity } from '../impl/deleteCommunity';
import { setupBelongClientMocks } from '../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('deleteCommunity', () => {
  const mockUser = { id: faker.string.uuid() };
  const communityId = faker.string.uuid();

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

    // Mock successful deletion by default
    const mockQuery = {
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue(mockQuery),
    });
  });

  it('should delete a community successfully', async () => {
    // Act
    await deleteCommunity(communityId);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('communities');
    expect(mockSupabase.from('').delete).toHaveBeenCalled();
    // expect(mockSupabase.from('').eq).toHaveBeenCalledWith('id', communityId);
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

  it('should throw an error when deletion fails', async () => {
    // Arrange
    const mockError = new Error('Failed to delete community');

    const mockQuery = {
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue(mockQuery),
    });

    // Act & Assert
    await expect(deleteCommunity(communityId)).rejects.toThrow(mockError);
  });
});
