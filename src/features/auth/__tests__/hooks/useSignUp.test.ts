import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSignUp } from '../../hooks/useSignUp';
import { createMockSupabase } from '@/test-utils';
import { createFakeAccount } from '../../__fakes__';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '../../types';

// Mock the API functions
vi.mock('../../api', () => ({
  signUp: vi.fn(),
}));

import { useSupabase } from '@/shared';
import { signUp } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockSignUp = vi.mocked(signUp);

describe('useSignUp', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let fakeAccount: Account;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeAccount = createFakeAccount({
      firstName: 'John', // Ensure firstName is always defined for tests
    });

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return Account after sign up', async () => {
    // Arrange
    const signUpData = {
      email: fakeAccount.email,
      password: 'password123',
      firstName: fakeAccount.firstName!,
      lastName: fakeAccount.lastName,
    };

    mockSignUp.mockResolvedValue(fakeAccount);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });
    const account = await result.current.mutateAsync(signUpData);

    // Assert: Should return Account object
    expect(account).toBeDefined();
    expect(account).toEqual(
      expect.objectContaining({
        id: fakeAccount.id,
        email: fakeAccount.email,
        firstName: fakeAccount.firstName,
        lastName: fakeAccount.lastName,
      }),
    );

    // Verify API was called with correct parameters
    expect(mockSignUp).toHaveBeenCalledWith(
      mockSupabase,
      signUpData.email,
      signUpData.password,
      signUpData.firstName,
      signUpData.lastName,
      undefined, // no invitationCode
    );
  });

  it('should pass invitationCode to signUp API when provided', async () => {
    // Arrange
    const invitationCode = 'CONNECT123';
    const signUpData = {
      email: fakeAccount.email,
      password: 'password123',
      firstName: fakeAccount.firstName!,
      lastName: fakeAccount.lastName,
      invitationCode,
    };

    mockSignUp.mockResolvedValue(fakeAccount);

    // Act
    const { result } = renderHook(() => useSignUp(), { wrapper });
    const account = await result.current.mutateAsync(signUpData);

    // Assert: Should return Account object
    expect(account).toBeDefined();
    expect(account).toEqual(
      expect.objectContaining({
        id: fakeAccount.id,
        email: fakeAccount.email,
        firstName: fakeAccount.firstName,
        lastName: fakeAccount.lastName,
      }),
    );

    // Verify API was called with invitationCode
    expect(mockSignUp).toHaveBeenCalledWith(
      mockSupabase,
      signUpData.email,
      signUpData.password,
      signUpData.firstName,
      signUpData.lastName,
      invitationCode,
    );
  });
});
