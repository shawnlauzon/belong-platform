import { renderHook, waitFor, act } from "@testing-library/react";
import { useCurrentUser, useSignIn, useSignOut, useSignUp } from "../../../src";
import { TestDataFactory, type TestUser } from "./test-data-factory";
import { testWrapperManager } from "./react-query-wrapper";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  testUser: TestUser;
}

export interface AuthSetupResult {
  user: AuthenticatedUser;
  testUser: TestUser;
  signOut: () => Promise<void>;
}

export class AuthTestHelper {
  private wrapper = testWrapperManager.getWrapper();

  async createAndAuthenticateUser(
    userData?: Partial<TestUser>,
  ): Promise<AuthSetupResult> {
    const testUser = TestDataFactory.createUser(userData);

    // Create hooks using consolidated pattern
    const { result } = renderHook(
      () => ({
        signUp: useSignUp(),
        signIn: useSignIn(),
        signOut: useSignOut(),
      }),
      { wrapper: this.wrapper },
    );

    // Sign up the user using the new useSignUp hook
    let account: any;
    await act(async () => {
      account = await result.current.signUp(testUser);
    });

    expect(account).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
      firstName: testUser.firstName,
      lastName: testUser.lastName,
    });

    // Sign in the user using the new useSignIn hook
    let signedInAccount: any;
    await act(async () => {
      signedInAccount = await result.current.signIn({
        email: testUser.email,
        password: testUser.password,
      });
    });

    expect(signedInAccount).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
    });

    const authenticatedUser: AuthenticatedUser = {
      userId: signedInAccount.id,
      email: signedInAccount.email,
      firstName: signedInAccount.firstName,
      lastName: signedInAccount.lastName,
      testUser,
    };

    const signOut = async () => {
      await act(async () => {
        await result.current.signOut();
      });
    };

    return {
      user: authenticatedUser,
      testUser,
      signOut,
    };
  }

  async signOutUser(): Promise<void> {
    // Check if user is currently authenticated using useCurrentUser
    const { result } = renderHook(
      () => ({
        currentUser: useCurrentUser(),
        signOut: useSignOut(),
      }),
      { wrapper: this.wrapper },
    );

    // Wait for current user hook to initialize
    await waitFor(
      () => {
        expect(result.current.currentUser.isLoading).toBeDefined();
      },
      { timeout: 5000 },
    );

    // Only sign out if user is authenticated (has user data)
    if (result.current.currentUser.data) {
      await act(async () => {
        await result.current.signOut();
      });
    }
  }

  async ensureSignedOut(): Promise<void> {
    try {
      await this.signOutUser();
    } catch (error) {
      // Ignore errors during cleanup
      console.warn("Sign out cleanup failed:", error);
    }

    // Clear cache regardless
    testWrapperManager.clearCache();
  }

  async createTestCredentials(): Promise<{ email: string; password: string }> {
    const testUser = TestDataFactory.createUser();
    return {
      email: testUser.email,
      password: testUser.password,
    };
  }

  async createMultipleAuthenticatedUsers(
    count: number,
  ): Promise<AuthSetupResult[]> {
    const users: AuthSetupResult[] = [];

    for (let i = 0; i < count; i++) {
      const userData = TestDataFactory.createUser();
      const authResult = await this.createAndAuthenticateUser(userData);
      users.push(authResult);
    }

    return users;
  }

  async waitForAuthState(
    expectedState: "authenticated" | "unauthenticated",
  ): Promise<void> {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: this.wrapper,
    });

    await waitFor(
      () => {
        if (expectedState === "authenticated") {
          expect(result.current.data).toBeDefined();
          expect(result.current.data).not.toBeNull();
          expect(result.current.isLoading).toBe(false);
        } else {
          expect(result.current.data).toBeNull();
          expect(result.current.isLoading).toBe(false);
        }
      },
      { timeout: 10000 },
    );
  }

  async signIn(email: string, password: string): Promise<any> {
    const { result } = renderHook(() => useSignIn(), { wrapper: this.wrapper });

    let signedInAccount: any;
    await act(async () => {
      signedInAccount = await result.current({
        email,
        password,
      });
    });

    return signedInAccount;
  }

  async signOut(): Promise<void> {
    return this.signOutUser();
  }

  async waitForAuthResult<T>(
    authResult: {
      current: {
        data?: T | null;
        isError: boolean;
        error?: Error | null;
        isLoading?: boolean;
      };
    },
    options: { timeout?: number; interval?: number } = {},
  ): Promise<T> {
    const { timeout = 5000, interval = 100 } = options;

    await waitFor(
      () => {
        const result = authResult.current;
        expect(result.data !== undefined || result.isError).toBe(true);
      },
      { timeout, interval },
    );

    if (authResult.current.isError) {
      const error = authResult.current.error;
      throw new Error(
        `Authentication failed: ${error?.message || "Unknown auth error"}`,
      );
    }

    const data = authResult.current.data;
    if (data === undefined || data === null) {
      throw new Error(`Expected auth result to have data but got ${data}`);
    }

    return data;
  }
}

export const authHelper = new AuthTestHelper();
