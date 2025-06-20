import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { createMockUser, createMockAccount } from '../../../test-utils/mocks';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the auth service
vi.mock('../../services/auth.service', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentAuthUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// Mock the user update function
vi.mock('../../../users/impl/updateUser', () => ({
  updateUser: vi.fn(),
}));

vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockAuthService = vi.mocked(await import('../../services/auth.service'));
const mockUpdateUser = vi.mocked(await import('../../../users/impl/updateUser')).updateUser;

describe('useAuth', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: any }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    setupBelongClientMocks();
  });

  describe('Auth State Queries', () => {
    it('should return auth state when user is authenticated', async () => {
      // Arrange
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockUser = createMockUser({ id: 'user-123', email: 'test@example.com' });

      mockAuthService.getCurrentAuthUser.mockResolvedValue(mockAuthUser);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      // Assert
      expect(result.current.currentUser).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should return unauthenticated state when no user', async () => {
      // Arrange
      mockAuthService.getCurrentAuthUser.mockResolvedValue(null);
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isAuthLoading).toBe(false);
      });

      // Assert
      expect(result.current.currentUser).toBe(undefined); // currentUserQuery is disabled when not authenticated
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it.skip('should handle auth query errors', async () => {
      // Arrange
      const error = new Error('Auth failed');
      mockAuthService.getCurrentAuthUser.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isError).toBe(true);
      });

      // Assert
      expect(result.current.currentUser).toBe(undefined); // currentUserQuery is disabled when auth fails
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('Sign In Mutation', () => {
    it('should call signIn service and invalidate caches on success', async () => {
      // Arrange
      const mockAccount = createMockAccount();
      mockAuthService.signIn.mockResolvedValue(mockAccount);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      await act(async () => {
        result.current.signIn.mutate({ 
          email: 'test@example.com', 
          password: 'password123' 
        });
      });

      await waitFor(() => expect(result.current.signIn.isSuccess).toBe(true));

      // Assert
      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.signIn.data).toEqual(mockAccount);
    });

    it('should handle signIn errors', async () => {
      // Arrange
      const error = new Error('Invalid credentials');
      mockAuthService.signIn.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      await act(async () => {
        result.current.signIn.mutate({ 
          email: 'test@example.com', 
          password: 'wrongpassword' 
        });
      });

      await waitFor(() => expect(result.current.signIn.isError).toBe(true));

      // Assert
      expect(result.current.signIn.error).toEqual(error);
      expect(result.current.signIn.isSuccess).toBe(false);
    });
  });

  describe('Sign Up Mutation', () => {
    it('should call signUp service with correct parameters', async () => {
      // Arrange
      const mockAccount = createMockAccount();
      mockAuthService.signUp.mockResolvedValue(mockAccount);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      await act(async () => {
        result.current.signUp.mutate({ 
          email: 'test@example.com', 
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        });
      });

      await waitFor(() => expect(result.current.signUp.isSuccess).toBe(true));

      // Assert
      expect(mockAuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'John', 'Doe');
      expect(result.current.signUp.data).toEqual(mockAccount);
    });

    it('should handle optional lastName parameter', async () => {
      // Arrange
      const mockAccount = createMockAccount();
      mockAuthService.signUp.mockResolvedValue(mockAccount);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      await act(async () => {
        result.current.signUp.mutate({ 
          email: 'test@example.com', 
          password: 'password123',
          firstName: 'John'
        });
      });

      await waitFor(() => expect(result.current.signUp.isSuccess).toBe(true));

      // Assert
      expect(mockAuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'John', undefined);
    });
  });

  describe('Sign Out Mutation', () => {
    it('should call signOut service and remove caches', async () => {
      // Arrange
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      mockAuthService.getCurrentAuthUser.mockResolvedValue(mockAuthUser);
      mockAuthService.signOut.mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for auth query to complete
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      // Act
      await act(async () => {
        result.current.signOut.mutate();
      });

      await waitFor(() => expect(result.current.signOut.isSuccess).toBe(true));

      // Assert
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should handle signOut errors', async () => {
      // Arrange
      const error = new Error('Sign out failed');
      mockAuthService.signOut.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      await act(async () => {
        result.current.signOut.mutate();
      });

      await waitFor(() => expect(result.current.signOut.isError).toBe(true));

      // Assert
      expect(result.current.signOut.error).toEqual(error);
    });
  });

  describe('Update Profile Mutation', () => {
    it('should call updateUser with correct parameters', async () => {
      // Arrange
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockUpdatedUser = createMockUser({ 
        id: 'user-123', 
        firstName: 'UpdatedName' 
      });

      mockAuthService.getCurrentAuthUser.mockResolvedValue(mockAuthUser);
      mockUpdateUser.mockResolvedValue(mockUpdatedUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for auth query to complete
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      // Act
      await act(async () => {
        result.current.updateProfile.mutate({ firstName: 'UpdatedName' });
      });

      await waitFor(() => expect(result.current.updateProfile.isSuccess).toBe(true));

      // Assert
      expect(mockUpdateUser).toHaveBeenCalledWith({ 
        id: 'user-123', 
        firstName: 'UpdatedName' 
      });
      expect(result.current.updateProfile.data).toEqual(mockUpdatedUser);
    });

    it('should handle updateProfile when not authenticated', async () => {
      // Arrange
      mockAuthService.getCurrentAuthUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for auth query to complete
      await waitFor(() => expect(result.current.isAuthenticated).toBe(false));

      // Act
      await act(async () => {
        result.current.updateProfile.mutate({ firstName: 'UpdatedName' });
      });

      await waitFor(() => expect(result.current.updateProfile.isError).toBe(true));

      // Assert
      expect(result.current.updateProfile.error?.message).toBe('No authenticated user to update');
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('should handle updateProfile errors', async () => {
      // Arrange
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const error = new Error('Update failed');

      mockAuthService.getCurrentAuthUser.mockResolvedValue(mockAuthUser);
      mockUpdateUser.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for auth query to complete
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      // Act
      await act(async () => {
        result.current.updateProfile.mutate({ firstName: 'UpdatedName' });
      });

      await waitFor(() => expect(result.current.updateProfile.isError).toBe(true));

      // Assert
      expect(result.current.updateProfile.error).toEqual(error);
    });
  });

  describe('Cache Integration', () => {
    it('should use unified cache keys for auth and user data', async () => {
      // Arrange
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockUser = createMockUser({ id: 'user-123' });

      mockAuthService.getCurrentAuthUser.mockResolvedValue(mockAuthUser);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      // Assert: Check that the correct cache keys are being used
      const authCache = queryClient.getQueryData(['auth']);
      const userCache = queryClient.getQueryData(['user', 'user-123']);

      expect(authCache).toEqual(mockAuthUser);
      expect(userCache).toEqual(mockUser);
    });

    it('should handle auth without user profile gracefully', async () => {
      // Arrange
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      
      mockAuthService.getCurrentAuthUser.mockResolvedValue(mockAuthUser);
      mockAuthService.getCurrentUser.mockResolvedValue(null); // No profile

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Assert
      expect(result.current.isAuthenticated).toBe(true); // Auth succeeded
      expect(result.current.currentUser).toBe(null); // But no profile
    });
  });
});