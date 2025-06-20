import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSignUp } from '../../hooks/useSignUp';
import { signUp } from '../../impl/signUp';
import { createMockUser, createMockAccount } from '../../../test-utils/mocks';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the implementation function
vi.mock('../../impl/signUp', () => ({
  signUp: vi.fn(),
}));

vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockSignUp = vi.mocked(signUp);

describe('useSignUp', () => {
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

  it('should call signUp implementation with user data', async () => {
    // Arrange
    const mockAccount = createMockAccount();

    mockSignUp.mockResolvedValue(mockAccount);

    // Mock profile fetch (no profile exists since user just signed up)
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
    const { result } = renderHook(() => useSignUp(), { wrapper });
    
    result.current.mutate({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(mockSignUp).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      { firstName: 'John', lastName: 'Doe' }
    );
  });

  it('should return Account data without caching anything', async () => {
    // Arrange
    const mockAccount = createMockAccount();
    mockSignUp.mockResolvedValue(mockAccount);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });
    
    result.current.mutate({
      email: mockAccount.email,
      password: 'password123',
      firstName: mockAccount.firstName,
      lastName: mockAccount.lastName,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert: Check mutation succeeded and returned Account
    expect(result.current.data).toEqual(mockAccount);
    expect(result.current.isSuccess).toBe(true);

    // Assert: Check that NO data is cached (new architecture)
    const cachedUser = queryClient.getQueryData(['currentUser']);
    expect(cachedUser).toBeUndefined();
  });

  it('should handle optional firstName and lastName parameters', async () => {
    // Arrange
    const mockAccount = createMockAccount({
      firstName: '',
      lastName: undefined,
    });
    mockSignUp.mockResolvedValue(mockAccount);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });
    
    result.current.mutate({
      email: mockAccount.email,
      password: 'password123',
      // firstName and lastName omitted
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert: Should handle optional parameters
    expect(mockSignUp).toHaveBeenCalledWith(
      mockAccount.email,
      'password123',
      { firstName: undefined, lastName: undefined }
    );
    expect(result.current.data).toEqual(mockAccount);
  });

  it('should handle errors properly', async () => {
    // Arrange
    const error = new Error('Sign up failed');
    mockSignUp.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });
    
    result.current.mutate({
      email: 'test@example.com',
      password: 'weakpassword',
      firstName: 'John',
      lastName: 'Doe',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert: Should handle error gracefully
    expect(result.current.error).toEqual(error);
    expect(result.current.isSuccess).toBe(false);
    
    // Assert: Should not cache anything on error
    const cachedUser = queryClient.getQueryData(['currentUser']);
    expect(cachedUser).toBeUndefined();
  });
});