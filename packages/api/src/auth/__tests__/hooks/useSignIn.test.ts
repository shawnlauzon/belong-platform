import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSignIn } from '../../hooks/useSignIn';
import { createMockUser, createMockAccount, createMockDbProfile } from '../../../test-utils/mocks';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// DON'T mock our platform functions - only mock external dependencies
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useSignIn', () => {
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

  it('should call supabase.auth.signInWithPassword through our platform code', async () => {
    // This test verifies that our platform code calls the actual Supabase function
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    const mockAccount = createMockAccount({ email: testEmail });

    // Mock Supabase signInWithPassword to return successful auth
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: mockAccount.id,
          email: testEmail,
          user_metadata: {
            first_name: mockAccount.firstName,
            last_name: mockAccount.lastName,
          },
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
        session: { access_token: 'mock-token' },
      },
      error: null,
    });

    // Mock profile fetch
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    // Act: Test our real platform code
    const { result } = renderHook(() => useSignIn(), { wrapper });
    
    result.current.mutate({
      email: testEmail,
      password: testPassword,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Spy verification: Ensure Supabase was actually called by our platform code
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: testEmail,
      password: testPassword,
    });

    // Verify the mutation succeeded
    expect(result.current.data).toEqual(expect.objectContaining({
      email: testEmail,
      firstName: mockAccount.firstName,
      lastName: mockAccount.lastName,
    }));
  });

  it('should return Account data without caching anything', async () => {
    // Arrange
    const mockAccount = createMockAccount();
    
    // Mock Supabase to return successful auth
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
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
        session: { access_token: 'mock-token' },
      },
      error: null,
    });

    // Mock profile fetch
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      }),
    };
    mockSupabase.from.mockReturnValue(mockQuery);

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });
    
    result.current.mutate({
      email: mockAccount.email,
      password: 'password123',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert: Check mutation succeeded and returned Account
    expect(result.current.data).toEqual(expect.objectContaining({
      email: mockAccount.email,
      firstName: mockAccount.firstName,
      lastName: mockAccount.lastName,
    }));
    expect(result.current.isSuccess).toBe(true);

    // Assert: Check that NO data is cached (new architecture)
    const cachedUser = queryClient.getQueryData(['currentUser']);
    expect(cachedUser).toBeUndefined();
  });

  it('should handle errors properly', async () => {
    // Arrange: Mock Supabase to return an error
    const error = new Error('Sign in failed');
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: error,
    });

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });
    
    result.current.mutate({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert: Should handle error gracefully
    expect(result.current.error).toBeTruthy();
    expect(result.current.isSuccess).toBe(false);
    
    // Assert: Should not cache anything on error
    const cachedUser = queryClient.getQueryData(['currentUser']);
    expect(cachedUser).toBeUndefined();

    // Verify Supabase was called
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
  });
});