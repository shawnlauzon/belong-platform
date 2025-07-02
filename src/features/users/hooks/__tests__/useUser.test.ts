import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { User } from '../../types';
import { useUser } from '../useUser';

// Mock the shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  queryKeys: {
    users: {
      byId: (id: string) => ['users', id],
    },
  },
}));

// Mock the user service
vi.mock('../../services/user.service', () => ({
  createUserService: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createUserService } from '../../services/user.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateUserService = vi.mocked(createUserService);
const mockFetchUserById = vi.fn();

describe('useUser', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateUserService.mockReturnValue({
      fetchUserById: mockFetchUserById,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return full User object when user exists', async () => {
    // Arrange
    const mockUser: User = {
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      bio: 'Product manager with 5 years of experience',
      profilePictureUrl: 'https://example.com/jane-avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchUserById.mockResolvedValue(mockUser);

    // Act
    const { result } = renderHook(() => useUser('user-1'), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toEqual(mockUser);
    expect(mockFetchUserById).toHaveBeenCalledWith('user-1');
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);

    // Verify the returned data has full user object
    expect(result.current.data!.firstName).toBe('Jane');
    expect(result.current.data!.lastName).toBe('Doe');
    expect(result.current.data!.email).toBe('jane@example.com');
    expect(result.current.data!.bio).toBe('Product manager with 5 years of experience');
  });

  it('should return null when user does not exist', async () => {
    // Arrange
    mockFetchUserById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useUser('non-existent-id'), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toBeNull();
    expect(mockFetchUserById).toHaveBeenCalledWith('non-existent-id');
  });

  it('should handle errors properly', async () => {
    // Arrange
    const error = new Error('Failed to fetch user');
    mockFetchUserById.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUser('user-1'), { wrapper });

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should enable query by default when userId is provided', () => {
    // Act
    const { result } = renderHook(() => useUser('user-1'), { wrapper });

    // Assert - Query should be enabled and pending initially
    expect(result.current.isPending).toBe(true);
  });

  it('should not fetch when userId is empty', () => {
    // Act
    const { result } = renderHook(() => useUser(''), { wrapper });

    // Assert - Query should be disabled when userId is empty
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should handle undefined userId gracefully', () => {
    // Act
    const { result } = renderHook(() => useUser(undefined as any), { wrapper });

    // Assert - Query should be disabled
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });
});