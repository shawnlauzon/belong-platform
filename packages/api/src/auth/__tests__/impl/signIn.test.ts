import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { signIn } from '../../impl/signIn';
import { createMockUser, createMockDbProfile } from '../../../test-utils/mocks';
import { supabase, logger } from '@belongnetwork/core';
import { toDomainUser } from '../../../transformers/userTransformer';

// Mock dependencies
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
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

describe('signIn', () => {
  const email = faker.internet.email();
  const password = faker.internet.password();
  const mockProfile = createMockDbProfile();
  const mockAuthUser = toDomainUser(mockProfile);
  const mockUser = createMockUser();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks to default implementations
    mockSupabase.auth.signInWithPassword.mockReset();
    mockSupabase.from('profiles').select('*').eq('id', mockUser.id).single.mockReset();
  });

  it('should sign in successfully with valid credentials', async () => {
    // Arrange
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
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
        session: {} as any,
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
    const result = await signIn(email, password);

    // Assert
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email,
      password,
    });
    expect(result).toEqual({
      ...mockAuthUser,
      email: mockUser.email,
      location: mockUser.location,
    });
    expect(mockLogger.info).toHaveBeenCalledWith('🔐 API: Successfully signed in', {
      userId: mockUser.id,
    });
  });

  it('should throw an error if sign in fails', async () => {
    // Arrange
    const error = new Error('Invalid login credentials');
    mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(error);

    // Act & Assert
    await expect(signIn(email, password)).rejects.toThrow('Invalid login credentials');
    expect(mockLogger.error).toHaveBeenCalledWith('🔐 API: Failed to sign in', { error });
  });

  it('should handle missing user data', async () => {
    // Arrange
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: null,
        session: null,
      },
      error: null,
    });

    // Act & Assert
    await expect(signIn(email, password)).rejects.toThrow('No user data returned from sign in');
  });

  it('should handle missing profile gracefully', async () => {
    // Arrange
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
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
        session: {} as any,
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
    const result = await signIn(email, password);

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
});
