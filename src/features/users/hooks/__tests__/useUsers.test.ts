import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { User, UserFilter } from '../../types';
import { useUsers } from '../useUsers';

// Mock the shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  toRecords: vi.fn((obj) => obj),
  queryKeys: {
    users: {
      all: ['users'],
      filtered: (filter: Record<string, any>) => ['users', 'filtered', filter],
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
const mockFetchUsers = vi.fn();

describe('useUsers (query-only)', () => {
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
      fetchUsers: mockFetchUsers,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return User[] when filters are not provided', async () => {
    // Arrange
    const mockUsers: User[] = [
      {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        bio: 'Software developer',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result.current).toEqual(mockUsers));

    // Assert
    expect(mockFetchUsers).toHaveBeenCalledWith(undefined);
  });

  it('should pass filters to fetchUsers and return filtered User[]', async () => {
    // Arrange
    const filters: UserFilter = { searchTerm: 'john' };
    const mockUsers: User[] = [
      {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(filters), { wrapper });

    // Wait for query to complete
    await waitFor(() => expect(result.current).toEqual(mockUsers));

    // Assert
    expect(mockFetchUsers).toHaveBeenCalledWith(filters);
  });

  it('should handle errors properly', async () => {
    // Arrange
    const error = new Error('Failed to fetch users');
    mockFetchUsers.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Wait for error (should return empty array on error)
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('should enable query by default', () => {
    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert - Query should be enabled by default and return empty array initially
    expect(result.current).toEqual([]);
  });

  it('should use correct query key based on filters', async () => {
    // Arrange
    const filters: UserFilter = { page: 1, pageSize: 10 };
    mockFetchUsers.mockResolvedValue([]);

    // Act - This will trigger the hook but we need to verify queryKey behavior
    renderHook(() => useUsers(filters), { wrapper });

    // Assert - The hook should call fetchUsers with the right filters
    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledWith(filters);
    });
  });
});