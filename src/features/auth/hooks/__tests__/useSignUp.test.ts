import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSignUp } from '../useSignUp';
import { createMockAccount } from '../../__mocks__';
import { BelongProvider } from '../../../../config';

// Mock the client creation at the right level
vi.mock('../../../../config/client', () => {
  // Create a mock Supabase client that we can control
  const mockSupabaseAuth = {
    signUp: vi.fn(),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  const mockClient = {
    supabase: {
      auth: mockSupabaseAuth,
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    mapbox: {
      autocomplete: vi.fn(),
      reverseGeocode: vi.fn(),
    },
  };

  return {
    createBelongClient: vi.fn(() => mockClient),
  };
});

describe('useSignUp', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;
  let mockSupabase: any;
  let mockAccount: ReturnType<typeof createMockAccount>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAccount = createMockAccount();

    // Get the mocked client to access supabase
    const { createBelongClient } = await import('../../../../config/client');
    const testConfig = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key',
      mapboxPublicToken: 'test-token',
    };
    const mockClient = vi.mocked(createBelongClient)(testConfig);
    mockSupabase = mockClient.supabase;

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: any }) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(BelongProvider, { config: testConfig }, children)
      );
  });

  it('should successfully sign up a user with first and last name', async () => {
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
    const { result } = renderHook(() => useSignUp(), { wrapper });

    const signUpResult = await result.current(signUpData);

    // Assert
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
    expect(signUpResult).toEqual({
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
  });

  it('should successfully sign up a user with only first name', async () => {
    // Arrange
    const signUpData = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'Jane',
    };
    const mockAuthData = {
      data: {
        user: {
          id: mockAccount.id,
          email: signUpData.email,
          user_metadata: {
            first_name: signUpData.firstName,
          },
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
      },
      error: null,
    };

    mockSupabase.auth.signUp.mockResolvedValue(mockAuthData);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });

    const signUpResult = await result.current(signUpData);

    // Assert
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: {
          first_name: signUpData.firstName,
          last_name: undefined,
        },
      },
    });
    expect(signUpResult.firstName).toBe(signUpData.firstName);
    expect(signUpResult.lastName).toBeUndefined();
  });

  it('should handle sign up errors properly', async () => {
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
    const { result } = renderHook(() => useSignUp(), { wrapper });

    // Assert
    await expect(result.current(signUpData)).rejects.toThrow('Email already exists');
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: {
          first_name: signUpData.firstName,
          last_name: undefined,
        },
      },
    });
  });

  it('should handle no user data returned error', async () => {
    // Arrange
    const signUpData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
    };

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });

    // Assert
    await expect(result.current(signUpData)).rejects.toThrow('No user data returned from sign up');
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: {
          first_name: signUpData.firstName,
          last_name: undefined,
        },
      },
    });
  });

  it('should handle network errors during sign up', async () => {
    // Arrange
    const signUpData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
    };
    const error = new Error('Network error');

    mockSupabase.auth.signUp.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });

    // Assert
    await expect(result.current(signUpData)).rejects.toThrow('Network error');
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: {
          first_name: signUpData.firstName,
          last_name: undefined,
        },
      },
    });
  });

  it('should return a function', () => {
    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });

    // Assert
    expect(typeof result.current).toBe('function');
  });

  it('should return a stable function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => useSignUp(), { wrapper });
    
    const firstReference = result.current;
    rerender();
    const secondReference = result.current;
    
    // Assert
    expect(firstReference).toBe(secondReference);
  });
});
