import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSignOut } from '../../hooks/useSignOut';
import { signOut } from '../../impl/signOut';
import { createMockUser } from '../../../test-utils/mocks';

// Mock the implementation function
vi.mock('../../impl/signOut', () => ({
  signOut: vi.fn(),
}));

vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockSignOut = vi.mocked(signOut);

describe('useSignOut', () => {
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
  });

  it('should call signOut implementation', async () => {
    // Arrange
    mockSignOut.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useSignOut(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should handle sign out errors properly', async () => {
    // Arrange
    const error = new Error('Sign out failed');
    mockSignOut.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useSignOut(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
    expect(mockSignOut).toHaveBeenCalled();
  });

});
