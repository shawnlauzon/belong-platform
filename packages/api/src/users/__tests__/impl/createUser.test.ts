import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser } from '../../impl/createUser';
import type { UserData } from '@belongnetwork/types';
import { createMockUser, createMockDbProfile, setupBelongClientMocks } from '../../../test-utils';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('createUser', () => {
  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ mockSupabase, mockLogger } = setupBelongClientMocks());
  });

  it('should create a new user successfully', async () => {
    // Arrange
    const mockDomainUser = createMockUser();
    const mockDbProfile = createMockDbProfile({
      id: mockDomainUser.id,
      email: mockDomainUser.email,
    });
    
    const mockUserData: UserData = {
      email: mockDomainUser.email,
      firstName: mockDomainUser.firstName,
      lastName: mockDomainUser.lastName,
      fullName: mockDomainUser.fullName,
      avatarUrl: mockDomainUser.avatarUrl,
      location: mockDomainUser.location,
    };

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockDbProfile,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await createUser(mockDomainUser.id, mockUserData);

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockQuery.insert).toHaveBeenCalled();
    expect(mockQuery.select).toHaveBeenCalledWith();
    expect(mockQuery.single).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: mockDbProfile.id,
      email: mockDbProfile.email,
    });

    // Verify logging
    expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Creating user', {
      email: mockUserData.email,
      accountId: mockDomainUser.id,
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      '👤 API: Successfully created user',
      expect.objectContaining({
        id: expect.any(String),
        email: mockUserData.email,
      })
    );
  });

  it('should throw an error when database insert fails', async () => {
    // Arrange
    const mockUserData: UserData = {
      email: 'test@example.com',
      firstName: 'Test',
    };
    
    const error = new Error('Database error');
    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(createUser('test-account-id', mockUserData)).rejects.toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        email: mockUserData.email,
        error,
      })
    );
  });

  it('should create a user with minimal required fields', async () => {
    // Arrange
    const minimalUserData: UserData = {
      email: 'test@example.com',
      firstName: 'Test',
    };

    const mockDbProfile = createMockDbProfile({
      email: minimalUserData.email,
      user_metadata: {
        first_name: minimalUserData.firstName,
      },
    });

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockDbProfile,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await createUser('test-account-id', minimalUserData);

    // Assert
    expect(result.email).toBe(minimalUserData.email);
    expect(result.firstName).toBe(minimalUserData.firstName);
  });

  it('should handle unexpected errors', async () => {
    // Arrange
    const mockUserData: UserData = {
      email: 'test@example.com',
      firstName: 'Test',
    };
    
    const error = new Error('Unexpected error');
    mockSupabase.from.mockImplementation(() => {
      throw error;
    });

    // Act & Assert
    await expect(createUser('test-account-id', mockUserData)).rejects.toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        email: mockUserData.email,
        error: expect.any(String),
      })
    );
  });
});