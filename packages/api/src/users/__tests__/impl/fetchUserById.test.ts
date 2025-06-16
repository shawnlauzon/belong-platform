import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { fetchUserById } from '../../impl/fetchUserById';
import { createMockDbProfile } from '../../../test-utils/mocks';
import { supabase } from '@belongnetwork/core';

// Mock the supabase client and logger
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('fetchUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully fetch a user by ID', async () => {
    // Arrange
    const mockProfile = createMockDbProfile({
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      } as any, // Type assertion to bypass type checking for test data
    });
    const userId = mockProfile.id;

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchUserById(userId);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(mockQuery.eq).toHaveBeenCalledWith('id', userId);
    expect(result).toMatchObject({
      id: mockProfile.id,
      email: mockProfile.email,
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('should return null when user is not found', async () => {
    // Arrange
    const userId = faker.string.uuid();
    const notFoundError = { code: 'PGRST116', message: 'Not found' };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: notFoundError,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await fetchUserById(userId);

    // Assert
    expect(result).toBeNull();
  });

  it('should throw an error when fetching fails', async () => {
    // Arrange
    const userId = faker.string.uuid();
    const mockError = new Error('Database error');

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(fetchUserById(userId)).rejects.toThrow(mockError);
  });
});
