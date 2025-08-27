import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { createMockSupabase } from '@/test-utils';
import { createFakeUser } from '@/features/users/__fakes__';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';

// Mock the API functions
vi.mock('../../api', () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock('@/features/users/api', () => ({
  fetchUserById: vi.fn(),
}));

import { useSupabase } from '@/shared';
import { getCurrentUserId } from '../../api';
import { fetchUserById } from '@/features/users/api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockFetchUserById = vi.mocked(fetchUserById);

describe('useCurrentUser', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let fakeUser: User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeUser = createFakeUser();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return User when authenticated', async () => {
    // Arrange
    mockGetCurrentUserId.mockResolvedValue(fakeUser.id);
    mockFetchUserById.mockResolvedValue(fakeUser);

    // Act
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
    const user = result.current.data;

    // Assert: Should return User object
    expect(user).toEqual(
      expect.objectContaining({
        id: fakeUser.id,
        email: fakeUser.email,
        firstName: fakeUser.firstName,
      }),
    );

    // Verify API was called correctly
    expect(mockGetCurrentUserId).toHaveBeenCalledWith(mockSupabase);
    expect(mockFetchUserById).toHaveBeenCalledWith(mockSupabase, fakeUser.id);
  });

  it('should return null when not authenticated', async () => {
    // Arrange
    mockGetCurrentUserId.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
    // Assert
    expect(result.current.data).toBeNull();
    expect(mockGetCurrentUserId).toHaveBeenCalledWith(mockSupabase);
    // fetchUserById should not be called when no user ID is returned
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });
});
