import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  useSignIn,
  useSignUp,
  useSignOut,
  useCurrentUser,
} from './auth';
import { createMockUser, createMockDbProfile } from './test-utils/mocks';
import { ReactQueryWrapper } from './test-utils/test-utils';
import { supabase, logger } from '@belongnetwork/core';
import { toDomainUser } from './transformers/userTransformer';

// Mock dependencies
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
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

describe('Authentication Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('signIn', () => {
    it('should successfully sign in a user with valid credentials', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const mockProfile = createMockDbProfile({ email });
      const mockAuthUser = toDomainUser(mockProfile);

      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      // Act
      const result = await signIn(email, password);

      // Assert
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(result).toMatchObject({
        id: mockAuthUser.id,
        email: mockAuthUser.email,
        first_name: mockAuthUser.first_name || '',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔐 API: Successfully signed in',
        { userId: result.id }
      );
    });

    it('should handle sign in failure with invalid credentials', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = 'wrongpassword';
      const authError = new Error('Invalid login credentials');

      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      // Act & Assert
      await expect(signIn(email, password)).rejects.toThrow(
        'Invalid login credentials'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        '🔐 API: Failed to sign in',
        { error: authError }
      );
    });

    it('should handle missing user data from auth response', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();

      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      // Act & Assert
      await expect(signIn(email, password)).rejects.toThrow(
        'No user data returned from sign in'
      );
    });

    it('should fallback gracefully when profile fetch fails', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const mockAuthUser = {
        id: faker.string.uuid(),
        email,
        created_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        user_metadata: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          full_name: faker.person.fullName(),
        },
      };

      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Profile not found'),
            }),
          }),
        }),
      });

      // Act
      const result = await signIn(email, password);

      // Assert
      expect(result).toMatchObject({
        id: mockAuthUser.id,
        email: mockAuthUser.email,
        first_name: mockAuthUser.user_metadata?.first_name || '',
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '🔐 API: Could not fetch user profile',
        { profileError: expect.any(Error) }
      );
    });
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const mockAuthUser = {
        id: faker.string.uuid(),
        email,
        created_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      };

      mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      // Act
      const result = await signUp(email, password, {
        firstName,
        lastName,
      });

      // Assert
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          },
        },
      });
      expect(result).toMatchObject({
        id: mockAuthUser.id,
        email: mockAuthUser.email,
        first_name: firstName,
        last_name: lastName,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔐 API: Successfully signed up',
        { userId: result.id }
      );
    });

    it('should handle sign up failure', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const signUpError = new Error('Email already registered');

      mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
        data: { user: null },
        error: signUpError,
      });

      // Act & Assert
      await expect(signUp(email, password)).rejects.toThrow(
        'Email already registered'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        '🔐 API: Failed to sign up',
        { error: signUpError }
      );
    });

    it('should handle missing user data from sign up response', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();

      mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(signUp(email, password)).rejects.toThrow(
        'No user data returned from sign up'
      );
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      // Arrange
      mockSupabase.auth.signOut = vi.fn().mockResolvedValue({
        error: null,
      });

      // Act
      await signOut();

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔐 API: Successfully signed out'
      );
    });

    it('should handle sign out failure', async () => {
      // Arrange
      const signOutError = new Error('Sign out failed');
      mockSupabase.auth.signOut = vi.fn().mockResolvedValue({
        error: signOutError,
      });

      // Act & Assert
      await expect(signOut()).rejects.toThrow('Sign out failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '🔐 API: Failed to sign out',
        { error: signOutError }
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should successfully get current user with profile', async () => {
      // Arrange
      const mockProfile = createMockDbProfile();
      const mockAuthUser = toDomainUser(mockProfile);

      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      // Act
      const result = await getCurrentUser();

      // Assert
      expect(result).toMatchObject({
        id: mockAuthUser.id,
        email: mockAuthUser.email,
        first_name: mockAuthUser.first_name || '',
      });
    });

    it('should return null when no user is authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });

    it('should handle auth error gracefully', async () => {
      // Arrange
      const authError = new Error('Session expired');
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      // Act
      const result = await getCurrentUser();

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '🔐 API: Failed to get current user',
        { error: authError }
      );
    });
  });
});

describe('Authentication Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createMockDbProfile({ id: mockUser.id }),
              error: null,
            }),
          }),
        }),
      });

      // Act
      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should handle no current user', async () => {
      // Arrange
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toBeNull();
    });
  });

  describe('useSignIn', () => {
    it('should sign in user and update cache', async () => {
      // Arrange
      const mockUser = createMockUser();
      const email = mockUser.email;
      const password = faker.internet.password();

      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createMockDbProfile({ id: mockUser.id }),
              error: null,
            }),
          }),
        }),
      });

      // Act
      const { result } = renderHook(() => useSignIn(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate({ email, password });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔐 API: User signed in successfully',
        { userId: expect.any(String) }
      );
    });

    it('should handle sign in error', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = 'wrongpassword';
      const authError = new Error('Invalid credentials');

      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      // Act
      const { result } = renderHook(() => useSignIn(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate({ email, password });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '🔐 API: Failed to sign in',
        { error: expect.any(Error) }
      );
    });
  });

  describe('useSignUp', () => {
    it('should sign up user and update cache', async () => {
      // Arrange
      const email = faker.internet.email();
      const password = faker.internet.password();
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const mockAuthUser = {
        id: faker.string.uuid(),
        email,
        created_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      };

      mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useSignUp(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate({
        email,
        password,
        metadata: { firstName, lastName },
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔐 API: User signed up successfully',
        { userId: expect.any(String) }
      );
    });
  });

  describe('useSignOut', () => {
    it('should sign out user and clear cache', async () => {
      // Arrange
      mockSupabase.auth.signOut = vi.fn().mockResolvedValue({
        error: null,
      });

      // Act
      const { result } = renderHook(() => useSignOut(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate();

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔐 API: User signed out successfully'
      );
    });

    it('should handle sign out error', async () => {
      // Arrange
      const signOutError = new Error('Sign out failed');
      mockSupabase.auth.signOut = vi.fn().mockResolvedValue({
        error: signOutError,
      });

      // Act
      const { result } = renderHook(() => useSignOut(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate();

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '🔐 API: Failed to sign out',
        { error: expect.any(Error) }
      );
    });
  });
});
