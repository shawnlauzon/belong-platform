import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { signIn } from '../../impl/signIn';
import { createMockUser, createMockDbProfile } from '../../../test-utils/mocks';
import { supabase, logger } from '@belongnetwork/core';
import { toDomainUser } from '../../../users/impl/userTransformer';

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

const mockSupabase = supabase as any;
const mockLogger = logger as any;

describe('signIn', () => {
  const email = faker.internet.email();
  const password = faker.internet.password();
  const mockAccount = createMockUser({
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  });
  const mockProfile = createMockDbProfile({
    id: mockAccount.id,
    email: mockAccount.email,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign in successfully with valid credentials', async () => {
    // Arrange
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
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
        session: {} as any,
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
    const result = await signIn(email, password);

    // Assert
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email,
      password,
    });
    expect(result).toMatchObject({
      id: mockAccount.id,
      email: mockAccount.email,
      first_name: (mockProfile.user_metadata as any).first_name,
    });
    expect(mockLogger.info).toHaveBeenCalledWith('🔐 API: Successfully signed in', {
      userId: mockAccount.id,
    });
  });

  it('should throw an error if sign in fails', async () => {
    // Arrange
    const error = new Error('Invalid login credentials');
    mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(error);

    // Act & Assert
    await expect(signIn(email, password)).rejects.toThrow('Invalid login credentials');
    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), { error });
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
          id: mockAccount.id,
          email: mockAccount.email,
          user_metadata: {},
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
        session: {} as any,
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
    const result = await signIn(email, password);

    // Assert
    expect(result).toMatchObject({
      id: mockAccount.id,
      email: mockAccount.email,
      first_name: '', // Implementation defaults to empty string when no metadata
      last_name: '',
      full_name: '',
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '🔐 API: Could not fetch user profile',
      expect.objectContaining({
        profileError: { message: 'Profile not found' },
      })
    );
  });
});
