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

    result.current.mutate(signUpData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

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
    expect(result.current.data).toEqual({
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

    result.current.mutate(signUpData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

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
    expect(result.current.data!.firstName).toBe(signUpData.firstName);
    expect(result.current.data!.lastName).toBeUndefined();
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

    result.current.mutate(signUpData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeDefined();
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

    result.current.mutate(signUpData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeDefined();
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

    result.current.mutate(signUpData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeDefined();
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

  it('should be idle initially', () => {
    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });

    // Assert
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should be pending during sign up', async () => {
    // Arrange
    const signUpData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
    };
    let resolveSignUp: (value: any) => void;

    const signUpPromise = new Promise((resolve) => {
      resolveSignUp = resolve;
    });

    mockSupabase.auth.signUp.mockReturnValue(signUpPromise);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });

    result.current.mutate(signUpData);

    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Assert
    expect(result.current.isPending).toBe(true);
    expect(result.current.isIdle).toBe(false);

    // Clean up
    resolveSignUp!({
      data: { user: null },
      error: new Error('Cleanup'),
    });
  });
});
