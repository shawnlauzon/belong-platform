import { renderHook, act, waitFor } from "@testing-library/react";
import { faker } from "@faker-js/faker";
import {
  useSignUp,
  useSignIn,
  useSignOut,
  useCommunities,
} from "@belongnetwork/platform";

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

/**
 * Creates and authenticates a user with community access for use in beforeAll
 */
export async function createAndAuthenticateUser(
  wrapper: any,
): Promise<AuthSetupResult> {
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
      }),
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

  return { testUser, testCommunity };
}

/**
 * Creates an additional user but maintains authentication of the primary user
 * Use this to create users for multi-user scenarios without affecting authentication state
 */
export async function createAdditionalUser(
  wrapper: any,
  primaryUser: TestUser,
): Promise<TestUser> {
  const additionalUser: TestUser = {
    email: `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`,
    password: faker.internet.password({ length: 12 }),
  };

  // Sign up the user (this automatically authenticates them)
  const { result: signUpResult } = renderHook(() => useSignUp(), {
    wrapper,
  });

  await act(async () => {
    signUpResult.current.mutate({
      email: additionalUser.email,
      password: additionalUser.password,
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
  additionalUser.userId = signUpResult.current.data?.id;

  // Re-authenticate the primary user to restore the correct authentication state
  const { result: signInResult } = renderHook(() => useSignIn(), {
    wrapper,
  });

  await act(async () => {
    signInResult.current.mutate({
      email: primaryUser.email,
      password: primaryUser.password,
    });
  });

  await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

  return additionalUser;
}
