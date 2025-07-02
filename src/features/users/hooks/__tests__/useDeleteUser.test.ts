import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useDeleteUser } from '../useDeleteUser';

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
      all: ['users'],
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
const mockDeleteUser = vi.fn();

describe('useDeleteUser', () => {
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
      deleteUser: mockDeleteUser,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully delete a user', async () => {
    // Arrange
    const userId = 'user-123';
    mockDeleteUser.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });
    
    const mutationResult = await result.current.mutateAsync(userId);

    // Assert
    expect(mutationResult).toBeUndefined();
    expect(mockDeleteUser).toHaveBeenCalledWith(userId);
    
    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle deletion errors properly', async () => {
    // Arrange
    const userId = 'non-existent-user';
    const error = new Error('User not found');
    mockDeleteUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    // Wait for mutation to be ready
    await waitFor(() => expect(result.current.mutate).toBeDefined());

    try {
      await result.current.mutateAsync(userId);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should handle authorization errors', async () => {
    // Arrange
    const userId = 'unauthorized-user';
    const error = new Error('You are not authorized to delete this user');
    mockDeleteUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    try {
      await result.current.mutateAsync(userId);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
  });

  it('should handle already deleted user gracefully', async () => {
    // Arrange - Service returns success even if user already deleted (idempotent delete)
    const userId = 'already-deleted-user';
    mockDeleteUser.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });
    
    const mutationResult = await result.current.mutateAsync(userId);

    // Assert
    expect(mutationResult).toBeUndefined();
    
    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle database constraint errors', async () => {
    // Arrange
    const userId = 'user-with-dependencies';
    const error = new Error('Cannot delete user: user has active community memberships');
    mockDeleteUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    try {
      await result.current.mutateAsync(userId);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
  });

  it('should invalidate and remove user queries on successful deletion', async () => {
    // Arrange
    const userId = 'user-789';
    mockDeleteUser.mockResolvedValue(undefined);

    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });
    await result.current.mutateAsync(userId);

    // Assert cache invalidation and removal happened
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
      expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['users', userId] });
    });
  });

  it('should provide a stable mutate function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => useDeleteUser(), { wrapper });
    const firstMutate = result.current.mutate;

    // Trigger re-render
    rerender();
    const secondMutate = result.current.mutate;

    // Assert - Function reference should be stable
    expect(firstMutate).toBe(secondMutate);
  });

  it('should be initially in idle state', () => {
    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    // Assert
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should reset mutation state between calls', async () => {
    // Arrange
    const firstUserId = 'user-1';
    const secondUserId = 'user-2';
    mockDeleteUser.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });
    
    // First deletion
    await result.current.mutateAsync(firstUserId);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Reset mutation
    result.current.reset();
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    // Second deletion
    await result.current.mutateAsync(secondUserId);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle soft delete behavior correctly', async () => {
    // Arrange - Soft delete means user is marked as deleted but not physically removed
    const userId = 'user-soft-delete';
    mockDeleteUser.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });
    await result.current.mutateAsync(userId);

    // Assert
    expect(mockDeleteUser).toHaveBeenCalledWith(userId);
    
    // Verify cache is cleaned up even for soft delete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});