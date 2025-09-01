import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { createMockSupabase } from '@/test-utils';
import { createFakeCurrentUser } from '@/features/users/__fakes__';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CurrentUser } from '@/features/users/types';

// Mock the API functions
vi.mock('../../api', () => ({
  getCurrentUser: vi.fn(),
}));

import { useSupabase } from '@/shared';
import { getCurrentUser } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe('useCurrentUser', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let fakeCurrentUser: CurrentUser;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeCurrentUser = createFakeCurrentUser();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return User when authenticated', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue(fakeCurrentUser);

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

    // Assert: Should return CurrentUser object (includes email)
    expect(user).toEqual(
      expect.objectContaining({
        id: fakeCurrentUser.id,
        email: fakeCurrentUser.email,
        firstName: fakeCurrentUser.firstName,
      }),
    );

    // Verify API was called correctly
    expect(mockGetCurrentUser).toHaveBeenCalledWith(mockSupabase);
  });

  it('should return null when not authenticated', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue(null);

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
    expect(mockGetCurrentUser).toHaveBeenCalledWith(mockSupabase);
  });
});
