import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAuth } from '../useAuth';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';
import { createMockUser } from '../../../test-utils/mocks';

// Mock the auth service
vi.mock('../../services/auth.service', () => ({
  getCurrentAuthUser: vi.fn(),
  getCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

// Mock core
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock user update
vi.mock('../../../users/impl/updateUser', () => ({
  updateUser: vi.fn(),
}));

describe('useAuth', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;

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

    setupBelongClientMocks();
  });

  it('should return unauthenticated state when no user', async () => {
    const { getCurrentAuthUser } = await import('../../services/auth.service');
    vi.mocked(getCurrentAuthUser).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authQuery.isSuccess).toBe(true));

    expect(result.current.authUser).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeUndefined();
  });

  it('should return authenticated state when user exists', async () => {
    const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
    const mockUser = createMockUser({ id: 'user-123', email: 'test@example.com' });

    const { getCurrentAuthUser, getCurrentUser } = await import('../../services/auth.service');
    vi.mocked(getCurrentAuthUser).mockResolvedValue(mockAuthUser);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.authQuery.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.currentUserQuery?.isSuccess).toBe(true));

    expect(result.current.authUser).toEqual(mockAuthUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser).toEqual(mockUser);
  });

  it('should handle sign in mutation', async () => {
    const mockAccount = { id: 'user-123', email: 'test@example.com' };
    
    const { signIn } = await import('../../services/auth.service');
    vi.mocked(signIn).mockResolvedValue(mockAccount as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signIn.mutateAsync({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => expect(result.current.signIn.isSuccess).toBe(true));
    expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('should handle sign out mutation', async () => {
    const { signOut } = await import('../../services/auth.service');
    vi.mocked(signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut.mutateAsync();
    });

    await waitFor(() => expect(result.current.signOut.isSuccess).toBe(true));
    expect(signOut).toHaveBeenCalled();
  });
});