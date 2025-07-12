import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { createMockSupabase } from '@/test-utils';
import { createFakeUser } from '@/features/users/__fakes__';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';

// Mock the API functions
vi.mock('@/features/users/api', () => ({
  updateUser: vi.fn(),
}));

// Mock the current user hook
vi.mock('../../hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

import { useSupabase } from '@/shared';
import { updateUser } from '@/features/users/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUpdateUser = vi.mocked(updateUser);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useUpdateProfile', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let fakeUser: User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeUser = createFakeUser();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Mock current user
    mockUseCurrentUser.mockReturnValue({
      data: fakeUser,
    });

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should update profile using mutateAsync', async () => {
    // Arrange
    const updateData = {
      firstName: 'Updated First',
      lastName: 'Updated Last',
    };

    const updatedUser = { ...fakeUser, ...updateData };
    mockUpdateUser.mockResolvedValue(updatedUser);

    // Act
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    const updated = await result.current.mutateAsync(updateData);

    // Assert: Should return updated User object
    expect(updated).toBeDefined();
    expect(updated).toEqual(
      expect.objectContaining({
        id: fakeUser.id,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
      }),
    );

    // Verify API was called with correct parameters
    expect(mockUpdateUser).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        id: fakeUser.id,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
      }),
    );
  });
});
