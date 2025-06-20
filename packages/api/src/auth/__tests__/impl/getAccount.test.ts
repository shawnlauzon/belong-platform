import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { getAccount } from '../../impl/getAccount';
import { createMockAccount } from '../../../test-utils/mocks';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('getAccount', () => {
  const mockAccount = createMockAccount();

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
    const result = await getAccount();

    // Assert
    expect(result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledWith('🔐 API: No authenticated user found');
  });

  it('should return Account with camelCase fields from Supabase user', async () => {
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

    // Act
    const result = await getAccount();

    // Assert
    expect(result).toEqual({
      id: mockAccount.id,
      email: mockAccount.email,
      firstName: mockAccount.firstName,
      lastName: mockAccount.lastName,
      fullName: mockAccount.fullName,
      avatarUrl: mockAccount.avatarUrl,
      location: mockAccount.location,
      createdAt: mockAccount.createdAt,
      updatedAt: mockAccount.updatedAt,
    });
    expect(mockLogger.debug).toHaveBeenCalledWith('🔐 API: Successfully retrieved current account', {
      userId: mockAccount.id,
    });
  });

  it('should handle missing user metadata gracefully', async () => {
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

    // Act
    const result = await getAccount();

    // Assert
    expect(result).toEqual({
      id: mockAccount.id,
      email: mockAccount.email,
      firstName: '',
      lastName: '',
      fullName: '',
      avatarUrl: undefined,
      location: undefined,
      createdAt: mockAccount.createdAt,
      updatedAt: mockAccount.updatedAt,
    });
  });

  it('should handle auth session missing error gracefully', async () => {
    // Arrange
    const error = new Error('Auth session missing');
    mockSupabase.auth.getUser.mockRejectedValueOnce(error);

    // Act
    const result = await getAccount();

    // Assert
    expect(result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      '🔐 API: No auth session found (user not authenticated)',
      { error: error.message }
    );
  });

  it('should throw non-auth errors', async () => {
    // Arrange
    const error = new Error('Database connection failed');
    mockSupabase.auth.getUser.mockRejectedValueOnce(error);

    // Act & Assert
    await expect(getAccount()).rejects.toThrow('Database connection failed');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '🔐 API: Error getting current account',
      { error }
    );
  });

  it('should never return snake_case fields (always camelCase)', async () => {
    // Arrange - simulate Supabase response with snake_case metadata
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: mockAccount.id,
          email: mockAccount.email,
          user_metadata: {
            first_name: 'Test',
            last_name: 'User',
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
      },
      error: null,
    });

    // Act
    const result = await getAccount();

    // Assert - Account should never have snake_case fields
    expect(result).not.toBeNull();
    const fieldNames = Object.keys(result!);
    const snakeCaseFields = fieldNames.filter(name => name.includes('_'));
    expect(snakeCaseFields).toEqual([]);
    
    // Verify expected camelCase fields exist
    expect(result).toHaveProperty('firstName');
    expect(result).toHaveProperty('lastName');
    expect(result).toHaveProperty('fullName');
    expect(result).toHaveProperty('avatarUrl');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
  });
});