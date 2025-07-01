import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAuth } from '../useAuth';
import { createMockUser } from '../../../users/__mocks__';
import { BelongProvider } from '../../../../config';
import { createMockAccount } from '../../__mocks__';

// Mock shared module to provide useSupabase and logger
vi.mock('../../../../shared', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    useSupabase: vi.fn(),
    logger: mockLogger,
  };
});

// Mock config to provide createBelongClient
vi.mock('../../../../config', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockSupabase = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  };

  const mockMapbox = {
    autocomplete: vi.fn(),
    reverseGeocode: vi.fn(),
  };

  const mockClient = {
    supabase: mockSupabase as any,
    logger: mockLogger as any,
    mapbox: mockMapbox as any,
  };

  const mockBelongProvider = ({ children, config }: any) => children;

  return {
    createBelongClient: vi.fn(() => mockClient),
    logger: mockLogger,
    BelongProvider: mockBelongProvider,
    STANDARD_CACHE_TIME: 5 * 60 * 1000,
    SHORT_CACHE_TIME: 2 * 60 * 1000,
    CACHE_STALE_TIME: {
      SHORT: 2 * 60 * 1000,
      STANDARD: 5 * 60 * 1000,
      LONG: 10 * 60 * 1000,
      EXTENDED: 30 * 60 * 1000,
    },
  };
});

// Import mocked useSupabase
import { useSupabase } from '../../../../shared';

// Mock user service
vi.mock('../../../users/services/user.service', () => ({
  createUserService: vi.fn(() => ({
    fetchUserById: vi.fn(),
    updateUser: vi.fn(),
  })),
}));

describe('useAuth', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;
  let mockSupabase: any;
  let mockUser: ReturnType<typeof createMockUser>;
  let mockAccount: ReturnType<typeof createMockAccount>;
  let mockUserService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUser = createMockUser();
    mockAccount = createMockAccount();

    // Setup mock supabase
    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    };

    // Mock useSupabase to return our mock
    vi.mocked(useSupabase).mockReturnValue(mockSupabase);

    // Get the mocked user service
    const { createUserService } = await import(
      '../../../users/services/user.service'
    );
    mockUserService = {
      fetchUserById: vi.fn(),
      updateUser: vi.fn(),
    };
    vi.mocked(createUserService).mockReturnValue(mockUserService);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const testConfig = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key',
      mapboxPublicToken: 'test-token',
    };

    wrapper = ({ children }: { children: any }) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(BelongProvider, { config: testConfig }, children)
      );
  });

  describe('currentUser query', () => {
    it('should return null when not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Assert
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return user data when authenticated', async () => {
      // Arrange
      const mockAuthResponse = {
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthResponse);
      mockUserService.fetchUserById.mockResolvedValue(mockUser);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.currentUser).toEqual(mockUser));

      // Assert
      expect(result.current.currentUser).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockUserService.fetchUserById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle auth errors by returning null and not retrying', async () => {
      // Arrange
      const error = new Error('Invalid Refresh Token');
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Assert
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('signIn mutation', () => {
    it('should successfully sign in and invalidate cache', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockAuthData = {
        data: {
          user: {
            id: mockAccount.id,
            email: mockAccount.email,
            user_metadata: {
              first_name: mockAccount.firstName,
              last_name: mockAccount.lastName,
            },
            created_at: mockAccount.createdAt.toISOString(),
            updated_at: mockAccount.updatedAt.toISOString(),
          },
        },
        error: null,
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockAuthData);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      const account = await result.current.signIn(credentials);

      // Assert
      expect(account).toEqual({
        id: mockAccount.id,
        email: mockAccount.email,
        firstName: mockAccount.firstName,
        lastName: mockAccount.lastName,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        createdAt: mockAccount.createdAt,
        updatedAt: mockAccount.updatedAt,
      });
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
      });
    });

    it('should handle sign in errors', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      const error = new Error('Invalid credentials');

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      await expect(result.current.signIn(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('signUp mutation', () => {
    it('should successfully sign up and invalidate cache', async () => {
      // Arrange
      const signUpData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };
      const mockAuthData = {
        data: {
          user: {
            id: mockAccount.id,
            email: signUpData.email,
            user_metadata: {
              first_name: signUpData.firstName,
              last_name: signUpData.lastName,
            },
            created_at: mockAccount.createdAt.toISOString(),
            updated_at: mockAccount.updatedAt.toISOString(),
          },
        },
        error: null,
      };

      mockSupabase.auth.signUp.mockResolvedValue(mockAuthData);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      const account = await result.current.signUp(signUpData);

      // Assert
      expect(account).toEqual({
        id: mockAccount.id,
        email: signUpData.email,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        createdAt: mockAccount.createdAt,
        updatedAt: mockAccount.updatedAt,
      });
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
          },
        },
      });
    });

    it('should handle sign up errors', async () => {
      // Arrange
      const signUpData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
      };
      const error = new Error('Email already exists');

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      await expect(result.current.signUp(signUpData)).rejects.toThrow(
        'Email already exists'
      );
    });
  });

  describe('signOut mutation', () => {
    it('should successfully sign out and remove cache', async () => {
      // Arrange
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.signOut();

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      // Arrange
      const error = new Error('Sign out failed');
      mockSupabase.auth.signOut.mockResolvedValue({ error });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      await expect(result.current.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('updateProfile mutation', () => {
    it('should successfully update profile when authenticated', async () => {
      // Arrange
      const mockAuthResponse = {
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthResponse);
      mockUserService.fetchUserById.mockResolvedValue(mockUser);

      const updates = { firstName: 'Updated' };
      const updatedUser = { ...mockUser, ...updates };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.currentUser).toEqual(mockUser));

      const resultUser = await result.current.updateProfile(updates);

      // Assert
      expect(resultUser).toEqual(updatedUser);
      expect(mockUserService.updateUser).toHaveBeenCalledWith({
        id: mockUser.id,
        firstName: 'Updated',
      });
    });

    it('should throw error when not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Assert
      await expect(
        result.current.updateProfile({ firstName: 'Updated' })
      ).rejects.toThrow('No authenticated user to update');
    });

    it('should handle update errors', async () => {
      // Arrange
      const mockAuthResponse = {
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthResponse);
      mockUserService.fetchUserById.mockResolvedValue(mockUser);

      const error = new Error('Update failed');
      mockUserService.updateUser.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.currentUser).toEqual(mockUser));

      // Assert
      await expect(
        result.current.updateProfile({ firstName: 'Updated' })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isPending).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
