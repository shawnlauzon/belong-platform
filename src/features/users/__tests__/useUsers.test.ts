import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { User, UserInfo, UserFilter } from '../../../types';
import { useUsers } from '../hooks/useUsers';

// Mock the shared module
vi.mock('../../../shared', () => ({
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
vi.mock('../services/user.service', () => ({
  createUserService: vi.fn(),
}));

import { useSupabase } from '../../../shared';
import { createUserService } from '../services/user.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateUserService = vi.mocked(createUserService);
const mockFetchUsers = vi.fn();
const mockFetchUserById = vi.fn();
const mockUpdateUser = vi.fn();
const mockDeleteUser = vi.fn();

describe('useUsers consolidated hook', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };

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
      fetchUsers: mockFetchUsers,
      fetchUserById: mockFetchUserById,
      updateUser: mockUpdateUser,
      deleteUser: mockDeleteUser,
    } as any);
  });

  it('should pass filters to fetchUsers via list function', async () => {
    // Arrange
    const filters: UserFilter = { communityId: 'community-1' };
    const mockUsers: UserInfo[] = [
      {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Manually list data with filters
    const listdData = await result.current.list(filters);

    // Assert
    expect(listdData).toEqual(mockUsers);
    expect(mockFetchUsers).toHaveBeenCalledWith(filters);
  });

  it('should not fetch data automatically and have correct initial status', () => {
    // Arrange
    const mockUsers: UserInfo[] = [];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert - Data should not be fetched automatically and status should be correct
    expect(mockFetchUsers).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false); // Query is idle (enabled: false = not pending)
    expect(result.current.isFetching).toBe(false);
  });

  it('should allow list to be called without filters', async () => {
    // Arrange
    const mockUsers: UserInfo[] = [];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchUsers).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve without filters
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockUsers);
    expect(mockFetchUsers).toHaveBeenCalledWith(undefined);
    expect(mockFetchUsers).toHaveBeenCalledTimes(1);
  });

  it('should have list function available', () => {
    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert
    expect(result.current.list).toBeDefined();
    expect(typeof result.current.list).toBe('function');
  });

  it('should return full User object from byId() method', async () => {
    // Arrange: Mock return value should be full User object
    const mockUser: User = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      bio: 'Software developer',
      profilePictureUrl: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchUserById.mockResolvedValue(mockUser);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });
    const fetchedUser = await result.current.byId('user-1');

    // Assert
    expect(fetchedUser).toEqual(mockUser);
    expect(mockFetchUserById).toHaveBeenCalledWith('user-1');

    // Verify the returned data has full user object
    expect(fetchedUser.firstName).toBe('John');
    expect(fetchedUser.lastName).toBe('Doe');
    expect(fetchedUser.email).toBe('john@example.com');
    expect(fetchedUser.bio).toBe('Software developer');
  });

  it('should handle byId with non-existent ID', async () => {
    // Arrange
    mockFetchUserById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });
    const fetchedUser = await result.current.byId('non-existent-id');

    // Assert
    expect(fetchedUser).toBeNull();
    expect(mockFetchUserById).toHaveBeenCalledWith('non-existent-id');
  });

  it('should have byId function available', () => {
    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert
    expect(result.current.byId).toBeDefined();
    expect(typeof result.current.byId).toBe('function');
  });
});
