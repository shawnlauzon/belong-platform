import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSignIn } from '../useSignIn';
import { createMockAccount } from '../../__mocks__';

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
    signIn: vi.fn(),
  })),
}));

// Import mocked modules
import { useSupabase } from '../../../../shared';
import { createAuthService } from '../../services/auth.service';

describe('useSignIn', () => {
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
      signIn: vi.fn(),
    };
    vi.mocked(createAuthService).mockReturnValue(mockAuthService);
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully sign in user', async () => {
    const mockAccount = createMockAccount();
    const credentials = { email: 'test@example.com', password: 'password123' };
    mockAuthService.signIn.mockResolvedValue(mockAccount);

    const { result } = renderHook(() => useSignIn(), { wrapper });

    const signInResult = await result.current(credentials);
    
    expect(signInResult).toEqual(mockAccount);
    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      credentials.email,
      credentials.password
    );
  });

  it('should handle sign in errors', async () => {
    const error = new Error('Invalid credentials');
    const credentials = { email: 'test@example.com', password: 'wrong' };
    mockAuthService.signIn.mockRejectedValue(error);

    const { result } = renderHook(() => useSignIn(), { wrapper });

    await expect(result.current(credentials)).rejects.toThrow('Invalid credentials');
    expect(mockAuthService.signIn).toHaveBeenCalledWith(
      credentials.email,
      credentials.password
    );
  });

  it('should invalidate auth queries on successful sign in', async () => {
    const mockAccount = createMockAccount();
    const credentials = { email: 'test@example.com', password: 'password123' };
    mockAuthService.signIn.mockResolvedValue(mockAccount);

    // Spy on query invalidation
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSignIn(), { wrapper });

    await result.current(credentials);
    
    // Wait for mutations to complete
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['auth'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['user', mockAccount.id] });
    });
  });

  it('should return a stable function reference', () => {
    const { result, rerender } = renderHook(() => useSignIn(), { wrapper });
    
    const firstReference = result.current;
    rerender();
    const secondReference = result.current;
    
    expect(firstReference).toBe(secondReference);
  });
});