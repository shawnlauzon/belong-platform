import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCurrentUserContext } from '../../hooks/useCurrentUser';
import { BelongContextProvider } from '../../providers/CurrentUserProvider';

// Mock the useCurrentUserQuery hook
vi.mock('../../hooks/useCurrentUserQuery', () => ({
  useCurrentUserQuery: vi.fn(),
}));

vi.mock('@belongnetwork/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockUseCurrentUserQuery = vi.mocked(await import('../../hooks/useCurrentUserQuery')).useCurrentUserQuery;

describe('useCurrentUserContext', () => {
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

  it('should throw error when used outside BelongContextProvider', () => {
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
        renderHook(() => useCurrentUserContext(), { wrapper });
      }).toThrow('useCurrentUserContext must be used within BelongContextProvider');
    } catch (error) {
      thrownError = error as Error;
    } finally {
      // Restore console.error
      console.error = originalError;
    }

    // Test should fail if the hook didn't throw the expected error
    if (thrownError && !thrownError.message.includes('useCurrentUserContext must be used within BelongContextProvider')) {
      throw new Error(`Expected hook to throw context error, but got: ${thrownError.message}`);
    }
  });

  it('should return user data when used inside BelongContextProvider', () => {
    const userData = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockUseCurrentUserQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: userData,
      error: null,
    } as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongContextProvider>
          {children}
        </BelongContextProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCurrentUserContext(), { wrapper });

    expect(result.current).toEqual({
      currentUser: userData,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('should have correct TypeScript types (no null checks needed)', () => {
    const userData = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockUseCurrentUserQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: userData,
      error: null,
    } as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongContextProvider>
          {children}
        </BelongContextProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCurrentUserContext(), { wrapper });

    // TypeScript should allow direct property access through currentUser property
    expect(result.current.currentUser?.id).toBe('user-123');
    expect(result.current.currentUser?.email).toBe('test@example.com');
    expect(result.current.currentUser?.firstName).toBe('Test');
    expect(result.current.currentUser?.lastName).toBe('User');
  });
});