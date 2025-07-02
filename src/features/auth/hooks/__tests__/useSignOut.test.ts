import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSignOut } from '../useSignOut';

// Mock shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the auth service
vi.mock('../../services/auth.service', () => ({
  createAuthService: vi.fn(() => ({
    signOut: vi.fn(),
  })),
}));

// Import mocked modules
import { useSupabase } from '../../../../shared';
import { createAuthService } from '../../services/auth.service';

describe('useSignOut', () => {
  let queryClient: QueryClient;
  let mockAuthService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockAuthService = {
      signOut: vi.fn(),
    };
    vi.mocked(createAuthService).mockReturnValue(mockAuthService);
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully sign out user', async () => {
    mockAuthService.signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await result.current();

    expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
  });

  it('should handle sign out errors', async () => {
    const error = new Error('Sign out failed');
    mockAuthService.signOut.mockRejectedValue(error);

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await expect(result.current()).rejects.toThrow('Sign out failed');
    expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
  });

  it('should successfully sign out without touching cache manually', async () => {
    mockAuthService.signOut.mockResolvedValue(undefined);

    // Add some cached data to verify it stays untouched
    queryClient.setQueryData(['auth'], {
      id: 'test-user',
      email: 'test@example.com',
    });

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await result.current();

    // Should have called auth service
    expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);

    // Cache should remain untouched by signOut hook
    // (cache invalidation should happen automatically via useCurrentUser)
    expect(queryClient.getQueryData(['auth'])).toBeDefined();
  });

  it('should complete sign out operation cleanly', async () => {
    mockAuthService.signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSignOut(), { wrapper });

    await result.current();

    // Should have successfully called the auth service
    expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
  });

  it('should return a stable function reference', () => {
    const { result, rerender } = renderHook(() => useSignOut(), { wrapper });

    const firstReference = result.current;
    rerender();
    const secondReference = result.current;

    expect(firstReference).toBe(secondReference);
  });
});
