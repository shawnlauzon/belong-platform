import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { User } from '../../types';
import { useUpdateUser } from '../useUpdateUser';

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
const mockUpdateUser = vi.fn();

describe('useUpdateUser', () => {
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
      updateUser: mockUpdateUser,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully update a user and return updated User object', async () => {
    // Arrange
    const updateData: Partial<User> & { id: string } = {
      id: 'user-123',
      firstName: 'UpdatedFirst',
      lastName: 'UpdatedLast',
      bio: 'Updated bio description',
    };

    const mockUpdatedUser: User = {
      id: 'user-123',
      firstName: 'UpdatedFirst',
      lastName: 'UpdatedLast',
      email: 'user@example.com',
      bio: 'Updated bio description',
      profilePictureUrl: 'https://example.com/updated-avatar.jpg',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };

    mockUpdateUser.mockResolvedValue(mockUpdatedUser);

    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });
    
    const mutationResult = await result.current.mutateAsync(updateData);

    // Assert
    expect(mutationResult).toEqual(mockUpdatedUser);
    expect(mockUpdateUser).toHaveBeenCalledWith(updateData);
    
    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle update errors properly', async () => {
    // Arrange
    const updateData: Partial<User> & { id: string } = {
      id: 'non-existent-user',
      firstName: 'Should Fail',
    };

    const error = new Error('User not found');
    mockUpdateUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    // Wait for mutation to be ready
    await waitFor(() => expect(result.current.mutate).toBeDefined());

    try {
      await result.current.mutateAsync(updateData);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should handle validation errors', async () => {
    // Arrange
    const updateData: Partial<User> & { id: string } = {
      id: 'user-123',
      email: 'invalid-email-format',
    };

    const error = new Error('Invalid email format');
    mockUpdateUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    try {
      await result.current.mutateAsync(updateData);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
  });

  it('should handle unauthorized updates', async () => {
    // Arrange
    const updateData: Partial<User> & { id: string } = {
      id: 'unauthorized-user',
      firstName: 'Unauthorized',
    };

    const error = new Error('You are not authorized to update this user');
    mockUpdateUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    try {
      await result.current.mutateAsync(updateData);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
  });

  it('should invalidate users queries on successful update', async () => {
    // Arrange
    const updateData: Partial<User> & { id: string } = {
      id: 'user-789',
      firstName: 'Updated',
      bio: 'Updated bio',
    };

    const mockUpdatedUser: User = {
      id: 'user-789',
      firstName: 'Updated',
      lastName: 'User',
      email: 'updated@example.com',
      bio: 'Updated bio',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUpdateUser.mockResolvedValue(mockUpdatedUser);

    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });
    await result.current.mutateAsync(updateData);

    // Assert cache invalidation happened
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
      expect(setQueryDataSpy).toHaveBeenCalledWith(['users', 'user-789'], mockUpdatedUser);
    });
  });

  it('should provide a stable mutate function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => useUpdateUser(), { wrapper });
    const firstMutate = result.current.mutate;

    // Trigger re-render
    rerender();
    const secondMutate = result.current.mutate;

    // Assert - Function reference should be stable
    expect(firstMutate).toBe(secondMutate);
  });

  it('should be initially in idle state', () => {
    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });

    // Assert
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should handle partial updates correctly', async () => {
    // Arrange - Only updating bio field
    const updateData: Partial<User> & { id: string } = {
      id: 'user-partial',
      bio: 'Only updating the bio field',
    };

    const mockUpdatedUser: User = {
      id: 'user-partial',
      firstName: 'Existing',
      lastName: 'User',
      email: 'existing@example.com',
      bio: 'Only updating the bio field',
      profilePictureUrl: 'https://example.com/existing.jpg',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };

    mockUpdateUser.mockResolvedValue(mockUpdatedUser);

    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });
    const mutationResult = await result.current.mutateAsync(updateData);

    // Assert
    expect(mutationResult).toEqual(mockUpdatedUser);
    expect(mockUpdateUser).toHaveBeenCalledWith(updateData);
    expect(mutationResult.bio).toBe('Only updating the bio field');
    expect(mutationResult.firstName).toBe('Existing'); // Unchanged fields preserved
  });
});