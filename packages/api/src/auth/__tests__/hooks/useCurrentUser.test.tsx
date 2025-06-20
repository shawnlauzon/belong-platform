import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBelong } from '../../providers/CurrentUserProvider';
import { BelongProvider } from '../../providers/CurrentUserProvider';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(() => ({
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
      },
    },
  })),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockUseAuth = vi.mocked(await import('../../hooks/useAuth')).useAuth;

describe('useBelong', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('should throw error when used outside BelongProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Suppress console.error for this expected error to avoid stderr noise
    const originalError = console.error;
    console.error = vi.fn();

    let thrownError: Error | undefined;
    try {
      expect(() => {
        renderHook(() => useBelong(), { wrapper });
      }).toThrow('useBelong must be used within BelongProvider');
    } catch (error) {
      thrownError = error as Error;
    } finally {
      // Restore console.error
      console.error = originalError;
    }

    // Test should fail if the hook didn't throw the expected error
    if (thrownError && !thrownError.message.includes('useBelong must be used within BelongProvider')) {
      throw new Error(`Expected hook to throw context error, but got: ${thrownError.message}`);
    }
  });

  it('should return user data when used inside BelongProvider', () => {
    const userData = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockUseAuth.mockReturnValue({
      currentUser: userData,
      isAuthenticated: true,
      isPending: false,
      isError: false,
      error: null,
      signIn: {} as any,
      signUp: {} as any,
      signOut: {} as any,
      updateProfile: {} as any,
    } as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongProvider>
          {children}
        </BelongProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useBelong(), { wrapper });

    expect(result.current).toEqual(
      expect.objectContaining({
        currentUser: userData,
        isAuthenticated: true,
        isPending: false,
        isError: false,
        error: null,
      })
    );
  });

  it('should have correct TypeScript types (no null checks needed)', () => {
    const userData = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockUseAuth.mockReturnValue({
      currentUser: userData,
      isAuthenticated: true,
      isPending: false,
      isError: false,
      error: null,
      signIn: {} as any,
      signUp: {} as any,
      signOut: {} as any,
      updateProfile: {} as any,
    } as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongProvider>
          {children}
        </BelongProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useBelong(), { wrapper });

    // TypeScript should allow direct property access through currentUser property
    expect(result.current.currentUser?.id).toBe('user-123');
    expect(result.current.currentUser?.email).toBe('test@example.com');
    expect(result.current.currentUser?.firstName).toBe('Test');
    expect(result.current.currentUser?.lastName).toBe('User');
  });
});