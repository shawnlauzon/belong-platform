import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSignIn } from '../../hooks/useSignIn';
import { createMockSupabase } from '@/test-utils';
import { createFakeAccount } from '../../__fakes__';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '../../types';

// Mock the API functions
vi.mock('../../api', () => ({
  signIn: vi.fn(),
}));

import { useSupabase } from '@/shared';
import { signIn } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockSignIn = vi.mocked(signIn);

describe('useSignIn', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let fakeAccount: Account;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeAccount = createFakeAccount();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return Account after sign in', async () => {
    // Arrange
    const signInData = {
      email: fakeAccount.email,
      password: 'password123',
    };

    mockSignIn.mockResolvedValue(fakeAccount);

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });
    const account = await result.current.mutateAsync(signInData);

    // Assert: Should return Account object
    expect(account).toBeDefined();
    expect(account).toEqual(
      expect.objectContaining({
        id: fakeAccount.id,
        email: fakeAccount.email,
        firstName: fakeAccount.firstName,
      }),
    );

    // Verify API was called with correct parameters
    expect(mockSignIn).toHaveBeenCalledWith(
      mockSupabase,
      signInData.email,
      signInData.password,
    );
  });
});
