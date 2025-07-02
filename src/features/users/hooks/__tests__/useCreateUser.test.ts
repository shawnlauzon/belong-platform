import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { UserData, User } from '../../types';
import { useCreateUser } from '../useCreateUser';

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
const mockCreateUser = vi.fn();

describe('useCreateUser', () => {
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
      createUser: mockCreateUser,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully create a user and return User object', async () => {
    // Arrange
    const accountId = 'account-123';
    const userData: UserData = {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      bio: 'Marketing specialist',
    };

    const mockCreatedUser: User = {
      id: accountId,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      bio: 'Marketing specialist',
      profilePictureUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreateUser.mockResolvedValue(mockCreatedUser);

    // Act
    const { result } = renderHook(() => useCreateUser(), { wrapper });
    
    const mutationResult = await result.current.mutateAsync({ accountId, userData });

    // Assert
    expect(mutationResult).toEqual(mockCreatedUser);
    expect(mockCreateUser).toHaveBeenCalledWith(accountId, userData);
    
    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle creation errors properly', async () => {
    // Arrange
    const accountId = 'account-456';
    const userData: UserData = {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'invalid-email',
    };

    const error = new Error('Invalid email format');
    mockCreateUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    // Wait for mutation to be ready
    await waitFor(() => expect(result.current.mutate).toBeDefined());

    try {
      await result.current.mutateAsync({ accountId, userData });
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should handle duplicate email errors', async () => {
    // Arrange
    const accountId = 'account-789';
    const userData: UserData = {
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie@example.com',
    };

    const error = new Error('User with this email already exists');
    mockCreateUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    try {
      await result.current.mutateAsync({ accountId, userData });
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
  });

  it('should invalidate users queries on successful creation', async () => {
    // Arrange
    const accountId = 'account-success';
    const userData: UserData = {
      firstName: 'Diana',
      lastName: 'Ross',
      email: 'diana.ross@example.com',
    };

    const mockCreatedUser: User = {
      id: accountId,
      firstName: 'Diana',
      lastName: 'Ross',
      email: 'diana.ross@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreateUser.mockResolvedValue(mockCreatedUser);

    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    // Act
    const { result } = renderHook(() => useCreateUser(), { wrapper });
    await result.current.mutateAsync({ accountId, userData });

    // Assert cache invalidation happened
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['users'] });
      expect(setQueryDataSpy).toHaveBeenCalledWith(['users', accountId], mockCreatedUser);
    });
  });

  it('should provide a stable mutate function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => useCreateUser(), { wrapper });
    const firstMutate = result.current.mutate;

    // Trigger re-render
    rerender();
    const secondMutate = result.current.mutate;

    // Assert - Function reference should be stable
    expect(firstMutate).toBe(secondMutate);
  });

  it('should be initially in idle state', () => {
    // Act
    const { result } = renderHook(() => useCreateUser(), { wrapper });

    // Assert
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});