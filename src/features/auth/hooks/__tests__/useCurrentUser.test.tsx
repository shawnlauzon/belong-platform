import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCurrentUser } from '../useCurrentUser';
import { createMockUser } from '../../../users/__mocks__';

// Mock shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  queryKeys: {
    auth: ['auth'],
  },
}));

// Mock the auth service
vi.mock('../../services/auth.service', () => ({
  createAuthService: vi.fn(() => ({
    getCurrentUser: vi.fn(),
  })),
}));

// Import mocked modules
import { useSupabase } from '../../../../shared';
import { createAuthService } from '../../services/auth.service';

describe('useCurrentUser', () => {
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
      getCurrentUser: vi.fn(),
    };
    vi.mocked(createAuthService).mockReturnValue(mockAuthService);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return current user when authenticated', async () => {
    const mockUser = createMockUser();
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUser);
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('should return null when not authenticated', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Invalid Refresh Token');
    mockAuthService.getCurrentUser.mockRejectedValue(error);

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Wait for the query to finish and enter error state (no retries for auth errors)
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
  });

  it('should not retry on auth errors', async () => {
    const authError = new Error('Invalid Refresh Token');
    mockAuthService.getCurrentUser.mockRejectedValue(authError);

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Should only be called once, no retries
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});