import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { getCurrentUser } from '../../impl/getCurrentUser';
import { createMockUser, createMockDbProfile } from '../../../test-utils/mocks';
import { supabase, logger } from '@belongnetwork/core';
import { toDomainUser } from '../../../transformers/userTransformer';

// Mock dependencies
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSupabase = vi.mocked(supabase);
const mockLogger = vi.mocked(logger);

describe('getCurrentUser', () => {
  const mockProfile = createMockDbProfile();
  const mockAuthUser = toDomainUser(mockProfile);
  const mockUser = createMockUser();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.from('profiles').select('*').eq('id', mockUser.id).single.mockReset();
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
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: {
            first_name: mockUser.first_name,
            last_name: mockUser.last_name,
            full_name: mockUser.full_name,
            avatar_url: mockUser.avatar_url,
            location: mockUser.location,
          },
          created_at: mockUser.created_at.toISOString(),
          updated_at: mockUser.updated_at.toISOString(),
        },
      },
      error: null,
    });

    mockSupabase.from('profiles')
      .select('*')
      .eq('id', mockUser.id)
      .single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

    // Act
    const result = await getCurrentUser();

    // Assert
    expect(result).toEqual({
      ...mockAuthUser,
      email: mockUser.email,
      location: mockUser.location,
    });
    expect(mockLogger.debug).toHaveBeenCalledWith('🔐 API: Successfully retrieved current user', {
      userId: mockUser.id,
    });
  });

  it('should handle missing profile gracefully', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: {
            first_name: mockUser.first_name,
            last_name: mockUser.last_name,
            full_name: mockUser.full_name,
            avatar_url: mockUser.avatar_url,
            location: mockUser.location,
          },
          created_at: mockUser.created_at.toISOString(),
          updated_at: mockUser.updated_at.toISOString(),
        },
      },
      error: null,
    });

    mockSupabase.from('profiles')
      .select('*')
      .eq('id', mockUser.id)
      .single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Profile not found' },
      });

    // Act
    const result = await getCurrentUser();

    // Assert
    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      first_name: mockUser.first_name,
      last_name: mockUser.last_name,
      full_name: mockUser.full_name,
      avatar_url: mockUser.avatar_url,
      location: mockUser.location,
      created_at: new Date(mockUser.created_at.toISOString()),
      updated_at: new Date(mockUser.updated_at.toISOString()),
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
