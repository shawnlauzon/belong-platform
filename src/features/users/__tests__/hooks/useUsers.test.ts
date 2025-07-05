import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from '../../hooks/useUsers';
import { createMockSupabase } from '../../../../test-utils';
import { createMockUser } from '../../__mocks__';
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
    const mockUsers = [
      createMockUser(),
      createMockUser(),
    ];

    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current).toEqual(mockUsers);
    });

    expect(mockFetchUsers).toHaveBeenCalledWith(mockSupabase, undefined);
  });

  it('should pass filters to fetchUsers', async () => {
    // Arrange
    const filters: UserFilter = {
      email: 'test@example.com',
    };
    const mockUsers = [createMockUser()];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(filters), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current).toEqual(mockUsers);
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
      expect(result.current).toEqual([]);
    });

    expect(mockFetchUsers).toHaveBeenCalledWith(mockSupabase, undefined);
  });

  it('should handle errors gracefully and return empty array', async () => {
    // Arrange
    const error = new Error('Failed to fetch users');
    mockFetchUsers.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert - Should return empty array on error
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    expect(mockFetchUsers).toHaveBeenCalledWith(mockSupabase, undefined);
  });
});