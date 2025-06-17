import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { getCurrentUser } from '../../impl/getCurrentUser';
import { createMockUser, createMockDbProfile } from '../../../test-utils/mocks';
import { toDomainUser } from '../../../users/impl/userTransformer';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('getCurrentUser', () => {
  const userId = faker.string.uuid();
  const mockProfile = createMockDbProfile({ id: userId });
  const mockAuthUser = toDomainUser(mockProfile);
  const mockAccount = createMockUser({ id: userId });

  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    mockLogger = mocks.mockLogger;
  });

  it('should return null when no user is authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    // Act
    const result = await getCurrentUser();

    // Assert
    expect(result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledWith('🔐 API: No authenticated user found');
  });

  it('should return the current user with profile', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: mockAccount.id,
          email: mockAccount.email,
          user_metadata: {
            first_name: mockAccount.firstName,
            last_name: mockAccount.lastName,
            full_name: mockAccount.fullName,
            avatar_url: mockAccount.avatarUrl,
            location: mockAccount.location,
          },
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
      },
      error: null,
    });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await getCurrentUser();

    // Assert
    expect(result).toMatchObject({
      id: userId,
      email: mockAccount.email,
      firstName: (mockProfile.user_metadata as any).first_name,
    });
    expect(mockLogger.debug).toHaveBeenCalledWith('🔐 API: Successfully retrieved current user', {
      userId: mockAccount.id,
    });
  });

  it('should handle missing profile gracefully', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: mockAccount.id,
          email: mockAccount.email,
          user_metadata: {},
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
      },
      error: null,
    });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await getCurrentUser();

    // Assert
    expect(result).toMatchObject({
      id: mockAccount.id,
      email: mockAccount.email,
      firstName: '',
      lastName: '',
      fullName: '',
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '🔐 API: Could not fetch user profile',
      expect.objectContaining({
        profileError: { message: 'Profile not found' },
      })
    );
  });

  it('should throw an error if getting user fails', async () => {
    // Arrange
    const error = new Error('Failed to get user');
    mockSupabase.auth.getUser.mockRejectedValueOnce(error);

    // Act & Assert
    await expect(getCurrentUser()).rejects.toThrow('Failed to get user');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '🔐 API: Error getting current user',
      { error }
    );
  });
});
