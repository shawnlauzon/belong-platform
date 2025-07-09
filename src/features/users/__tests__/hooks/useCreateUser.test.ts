import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCreateUser } from '../../hooks/useCreateUser';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeUserData, createFakeUserDetail } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API functions
vi.mock('../../api', () => ({
  createUser: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createUser } from '../../api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateUser = vi.mocked(createUser);

describe('useCreateUser', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return User after creation', async () => {
    // Arrange: Create test data using factories
    const fakeUser = createFakeUserDetail();
    const userData = createFakeUserData();

    mockCreateUser.mockResolvedValue(fakeUser);

    // Act
    const { result } = renderHook(() => useCreateUser(), { wrapper });
    const createdUser = await result.current.mutateAsync(userData);

    // Assert: Should return User
    expect(createdUser).toBeDefined();
    expect(createdUser).toEqual(
      expect.objectContaining({
        id: fakeUser.id,
        firstName: fakeUser.firstName,
        lastName: fakeUser.lastName,
        email: fakeUser.email,
      }),
    );

    // Verify API was called with correct parameters
    expect(mockCreateUser).toHaveBeenCalledWith(mockSupabase, userData);
  });
});
