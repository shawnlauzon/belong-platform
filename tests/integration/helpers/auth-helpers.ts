import { renderHook, act, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import {
  useSignUp,
  useSignIn,
  useCommunities,
} from '@belongnetwork/platform';

export interface TestUser {
  email: string;
  password: string;
  userId?: string;
}

export interface TestCommunity {
  id?: string;
  name: string;
}

export interface AuthSetupResult {
  testUser: TestUser;
  testCommunity: TestCommunity;
}

export interface TwoUserSetupResult extends AuthSetupResult {
  recipientUser: TestUser;
}

let cachedAuthSetup: AuthSetupResult | null = null;
let isCacheValid = false;

/**
 * Sets up an authenticated user and community, caching the result for reuse
 */
export async function setupAuthenticatedUser(wrapper: any): Promise<AuthSetupResult> {
  if (isCacheValid && cachedAuthSetup) {
    return cachedAuthSetup;
  }

  const testUser: TestUser = {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
  };

  const testCommunity: TestCommunity = {
    name: `Test Community ${Date.now()}`,
  };

  // Get existing communities to use for testing
  const { result: communitiesResult } = renderHook(() => useCommunities(), {
    wrapper,
  });

  await waitFor(() => {
    expect(communitiesResult.current).toEqual(
      expect.objectContaining({
        isSuccess: true,
        data: expect.any(Array),
        error: null,
      })
    );
  });
  const existingCommunity = communitiesResult.current.data?.[0];
  expect(existingCommunity).toBeDefined();
  testCommunity.id = existingCommunity!.id;

  // Sign up test user
  const { result: signUpResult } = renderHook(() => useSignUp(), {
    wrapper,
  });

  await act(async () => {
    signUpResult.current.mutate({
      email: testUser.email,
      password: testUser.password,
    });
  });

  await waitFor(() => {
    expect(signUpResult.current).toMatchObject({
      isSuccess: true,
      data: expect.objectContaining({
        id: expect.any(String),
      }),
      error: null,
    });
  });
  testUser.userId = signUpResult.current.data?.id;

  // Sign in test user
  const { result: signInResult } = renderHook(() => useSignIn(), {
    wrapper,
  });

  await act(async () => {
    signInResult.current.mutate({
      email: testUser.email,
      password: testUser.password,
    });
  });

  await waitFor(() => {
    expect(signInResult.current).toMatchObject({
      isSuccess: true,
      data: expect.objectContaining({
        id: expect.any(String),
      }),
      error: null,
    });
  });

  const result = { testUser, testCommunity };
  cachedAuthSetup = result;
  isCacheValid = true;
  
  return result;
}

/**
 * Sets up two authenticated users for multi-user scenarios (like thanks)
 */
export async function setupTwoUsers(wrapper: any): Promise<TwoUserSetupResult> {
  const { testUser, testCommunity } = await setupAuthenticatedUser(wrapper);

  // Create a second user (recipient)
  const recipientUser: TestUser = {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
  };

  const { result: signUpRecipientResult } = renderHook(() => useSignUp(), {
    wrapper,
  });

  await act(async () => {
    signUpRecipientResult.current.mutate({
      email: recipientUser.email,
      password: recipientUser.password,
    });
  });

  await waitFor(() => expect(signUpRecipientResult.current.isSuccess).toBe(true));
  recipientUser.userId = signUpRecipientResult.current.data?.id;
  expect(recipientUser.userId).toBeDefined();
  expect(recipientUser.userId).not.toBe(testUser.userId);

  return { testUser, testCommunity, recipientUser };
}

/**
 * Resets the authentication cache - call in afterEach or when switching test suites
 */
export function resetAuthCache() {
  cachedAuthSetup = null;
  isCacheValid = false;
}

/**
 * Ensures a user is authenticated for the current test suite, reusing cached auth if available
 */
export async function ensureAuthenticated(wrapper: any): Promise<AuthSetupResult> {
  return setupAuthenticatedUser(wrapper);
}