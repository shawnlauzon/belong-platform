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

/**
 * Sets up an authenticated user and community for use in beforeAll
 */
export async function setupAuthenticatedUser(wrapper: any): Promise<AuthSetupResult> {

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

  return { testUser, testCommunity };
}

/**
 * Sets up two authenticated users for multi-user scenarios (like thanks)
 * Should be called in beforeAll to avoid repeated authentication calls
 */
export async function setupTwoUsers(wrapper: any): Promise<TwoUserSetupResult> {

  // Create fresh users for multi-user scenarios
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

  // Sign up first user (sender)
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

  // Sign in first user (sender)
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

  // Create a second user (recipient) - only signup, no signin needed
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
