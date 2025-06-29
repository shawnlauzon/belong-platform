import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@belongnetwork/platform";
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
    userData?: Partial<TestUser>
  ): Promise<AuthSetupResult> {
    const testUser = TestDataFactory.createUser(userData);
    
    // Create hook instance
    const { result } = renderHook(() => useAuth(), { wrapper: this.wrapper });

    // Wait for hook to initialize
    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current).not.toBeNull();
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signIn).toBe('function');
    }, { timeout: 10000 });

    // Sign up the user
    let signUpResult: any;
    await act(async () => {
      signUpResult = await result.current.signUp(testUser);
    });

    expect(signUpResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
      firstName: testUser.firstName,
      lastName: testUser.lastName,
    });

    // Sign in the user
    let signInResult: any;
    await act(async () => {
      signInResult = await result.current.signIn({
        email: testUser.email,
        password: testUser.password,
      });
    });

    expect(signInResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
    });

    const authenticatedUser: AuthenticatedUser = {
      userId: signInResult.id,
      email: signInResult.email,
      firstName: signInResult.firstName,
      lastName: signInResult.lastName,
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
    const { result } = renderHook(() => useAuth(), { wrapper: this.wrapper });
    
    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current.signOut).toBeDefined();
    }, { timeout: 5000 });

    if (result.current.isAuthenticated) {
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

  async createMultipleAuthenticatedUsers(count: number): Promise<AuthSetupResult[]> {
    const users: AuthSetupResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const userData = TestDataFactory.createUser();
      const authResult = await this.createAndAuthenticateUser(userData);
      users.push(authResult);
    }
    
    return users;
  }

  async waitForAuthState(expectedState: 'authenticated' | 'unauthenticated'): Promise<void> {
    const { result } = renderHook(() => useAuth(), { wrapper: this.wrapper });
    
    await waitFor(() => {
      if (expectedState === 'authenticated') {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.currentUser).toBeDefined();
      } else {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.currentUser).toBeNull();
      }
    }, { timeout: 10000 });
  }
}

export const authHelper = new AuthTestHelper();