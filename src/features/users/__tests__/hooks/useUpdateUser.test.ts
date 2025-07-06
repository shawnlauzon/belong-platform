import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateUser } from '../../hooks/useUpdateUser';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeUser } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API
vi.mock('../../api', () => ({
  updateUser: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { updateUser } from '../../api';
import { UserData } from '../../types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUpdateUser = vi.mocked(updateUser);

describe('useUpdateUser', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return User after update', async () => {
    // Arrange: Create test data using factories
    const mockUpdatedUser = createFakeUser();
    const updateData: Partial<UserData> = {
      firstName: 'Updated First',
      lastName: 'Updated Last',
    };

    mockUpdateUser.mockResolvedValue(mockUpdatedUser);

    // Act
    const { result } = renderHook(() => useUpdateUser(), { wrapper });
    const updatedUser = await result.current.mutateAsync({
      id: mockUpdatedUser.id,
      ...updateData,
    });

    // Assert: Should return User
    expect(updatedUser).toBeDefined();
    expect(updatedUser).toEqual(mockUpdatedUser);

    // Verify API was called with correct parameters
    expect(mockUpdateUser).toHaveBeenCalledWith(mockSupabase, {
      id: mockUpdatedUser.id,
      ...updateData,
    });
  });
});
