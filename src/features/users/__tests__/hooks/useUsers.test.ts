import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from '../../hooks/useUsers';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeUser } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../shared/__tests__/testWrapper';

// Mock the API
vi.mock('../../api', () => ({
  fetchUsers: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchUsers } from '../../api';
import { UserFilter } from '../../types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchUsers = vi.mocked(fetchUsers);

describe('useUsers', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return User[] from fetchUsers', async () => {
    // Arrange: Mock return value should be User[]
    const fakeUsers = [
      createFakeUser(),
      createFakeUser(),
    ];

    mockFetchUsers.mockResolvedValue(fakeUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(fakeUsers);
    });

    expect(mockFetchUsers).toHaveBeenCalledWith(mockSupabase, undefined);
  });

  it('should pass filters to fetchUsers', async () => {
    // Arrange
    const filters: UserFilter = {
      email: 'test@example.com',
    };
    const fakeUsers = [createFakeUser()];
    mockFetchUsers.mockResolvedValue(fakeUsers);

    // Act
    const { result } = renderHook(() => useUsers(filters), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(fakeUsers);
    });

    expect(mockFetchUsers).toHaveBeenCalledWith(mockSupabase, filters);
  });

  it('should return empty array when no users exist', async () => {
    // Arrange
    mockFetchUsers.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });

    expect(mockFetchUsers).toHaveBeenCalledWith(mockSupabase, undefined);
  });

  it('should handle errors gracefully and return error state', async () => {
    // Arrange
    const error = new Error('Failed to fetch users');
    mockFetchUsers.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert - Should return error state
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
    expect(mockFetchUsers).toHaveBeenCalledWith(mockSupabase, undefined);
  });
});