import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCurrentUserQuery } from '../../hooks/useCurrentUserQuery';
import { useSignIn } from '../../hooks/useSignIn';
import { useSignUp } from '../../hooks/useSignUp';
import { useSignOut } from '../../hooks/useSignOut';
import { createMockUser, createMockAccount } from '../../../test-utils/mocks';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the useCurrentUserId hook that useCurrentUserQuery depends on
vi.mock('../../hooks/useCurrentUserId', () => ({
  useCurrentUserId: vi.fn(),
}));

vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockUseCurrentUserId = vi.mocked(await import('../../hooks/useCurrentUserId')).useCurrentUserId;

describe('useCurrentUserQuery', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;
  let mockSupabase: any;

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

    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
  });

  it('should fetch and return User data when authenticated', async () => {
    // Arrange: Mock authenticated user
    const mockAccount = createMockAccount({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });

    // Mock useCurrentUserId to return the user ID
    mockUseCurrentUserId.mockReturnValue({
      data: mockAccount.id,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    // Mock profile fetch from fetchUserById
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: mockAccount.id,
          email: mockAccount.email,
          user_metadata: {
            first_name: mockAccount.firstName,
            last_name: mockAccount.lastName,
          },
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    // Act
    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert: Should return User data
    expect(result.current.data).toEqual(
      expect.objectContaining({
        id: mockAccount.id,
        email: mockAccount.email,
        firstName: mockAccount.firstName,
        lastName: mockAccount.lastName,
      })
    );
  });

  it('should return null when not authenticated', async () => {
    // Arrange: Mock no authenticated user (useCurrentUserId returns null)
    mockUseCurrentUserId.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    // Act
    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert: Query should return null when no user ID
    expect(result.current.data).toBeNull();
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isPending).toBe(false);
  });

  it('should handle auth errors gracefully', async () => {
    // Arrange: Mock auth error from useCurrentUserId
    mockUseCurrentUserId.mockReturnValue({
      data: null,
      isPending: false,
      isError: true,
      error: { message: 'Invalid token' },
    } as any);

    // Act
    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert: Query should return null when auth fails
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false); // Query itself is not in error, it returns null
    expect(result.current.isPending).toBe(false);
  });

  it('should show pending state while useCurrentUserId is loading', async () => {
    // Arrange: Mock useCurrentUserId in pending state
    mockUseCurrentUserId.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    } as any);

    // Act
    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper });

    // Assert: Should show pending state
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should call fetchUserById when user ID is available', async () => {
    // Arrange: Mock user ID and profile data
    const mockUserId = 'test-user-id';
    const mockUser = createMockUser();

    mockUseCurrentUserId.mockReturnValue({
      data: mockUserId,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: {
            first_name: mockUser.firstName,
            last_name: mockUser.lastName,
          },
          created_at: mockUser.createdAt.toISOString(),
          updated_at: mockUser.updatedAt.toISOString(),
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    // Act
    const { result } = renderHook(() => useCurrentUserQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert: Should have called the profiles table with the user ID
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockQuery.eq).toHaveBeenCalledWith('id', mockUserId);
    expect(result.current.data).toEqual(expect.objectContaining({
      id: mockUser.id,
      email: mockUser.email,
    }));
  });

  it('should be enabled only when user ID is available', async () => {
    // This test verifies that the query is disabled when there's no user ID

    // First test: No user ID (query should be disabled)
    mockUseCurrentUserId.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const { result: result1 } = renderHook(() => useCurrentUserQuery(), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    
    // Should return null without making any API calls
    expect(result1.current.data).toBeNull();
    expect(result1.current.isSuccess).toBe(true);
    expect(result1.current.isPending).toBe(false);
    expect(mockSupabase.from).not.toHaveBeenCalled();

    // Clear mocks for second test
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    
    // Need to re-create QueryClient for fresh test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: any }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    // Second test: With user ID (query should be enabled)
    const mockUserId = 'test-user-id';
    mockUseCurrentUserId.mockReturnValue({
      data: mockUserId,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: mockUserId,
          email: 'test@example.com',
          user_metadata: {
            first_name: 'Test',
            last_name: 'User',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    const { result: result2 } = renderHook(() => useCurrentUserQuery(), { wrapper });

    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    
    // Should have made API call when user ID is available
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });
});