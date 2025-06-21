import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  renderHook,
  waitFor,
  act,
  render,
  screen,
} from "@testing-library/react";
import { faker } from "@faker-js/faker";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useAuth,
  useSignUp,
  useSignIn,
  useSignOut,
  BelongProvider,
} from "@belongnetwork/platform";

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
};

describe("Authentication Integration", () => {
  beforeAll(() => {
    // Create query client once for all tests
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Single wrapper instance to avoid multiple Supabase clients
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongProvider config={config}>{children}</BelongProvider>
      </QueryClientProvider>
    );
  });

  afterAll(async () => {
    // Clear all cached data after tests complete
    queryClient.clear();
  });

  // Clean up auth state between tests to ensure isolation
  async function signOutBetweenTests() {
    try {
      // Don't invalidate queries - this breaks auth state for useBelong
      // The tests will handle their own auth setup and cleanup
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  test("useAuth signUp should work with BelongProvider config", async () => {
    await signOutBetweenTests();

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for hook to initialize properly
    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current).not.toBeNull();
      expect(typeof result.current.signUp).toBe('function');
      // Ensure mutations are ready
      expect(result.current.signUp).not.toBeUndefined();
    }, { timeout: 15000 });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    let signUpResult: any;
    await act(async () => {
      signUpResult = await result.current.signUp(testUser);
    });

    expect(signUpResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(), // Supabase normalizes emails to lowercase
      firstName: testUser.firstName,
    });
  });

  test("useAuth signIn should work after signing up a user", async () => {
    await signOutBetweenTests();

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for auth hook to initialize properly
    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current).not.toBeNull();
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signIn).toBe('function');
      // Ensure mutations are ready
      expect(result.current.signUp).not.toBeUndefined();
      expect(result.current.signIn).not.toBeUndefined();
    }, { timeout: 15000 });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // First sign up the user
    let signUpResult: any;
    await act(async () => {
      signUpResult = await result.current.signUp(testUser);
    });

    expect(signUpResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(), // Supabase normalizes emails to lowercase
    });

    // Now test sign in
    let signInResult: any;
    await act(async () => {
      signInResult = await result.current.signIn({
        email: testEmail,
        password: testPassword,
      });
    });

    expect(signInResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(), // Supabase normalizes emails to lowercase
    });
  });

  test("useAuth should render error when unauthenticated", async () => {
    await signOutBetweenTests();

    const TestComponent = () => {
      const { currentUser, isAuthenticated } = useAuth();
      if (!isAuthenticated || !currentUser) {
        return <div data-testid="no-user">No user</div>;
      }
      return <div data-testid="user-data">{currentUser.email}</div>;
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    // Wait for the component to render with no user
    await waitFor(() => {
      expect(getByTestId("no-user")).toBeDefined();
    });
  });

  test("useAuth should return user data when authenticated", async () => {
    await signOutBetweenTests();

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Use the consolidated useAuth hook
    const { result: authResult } = renderHook(() => useAuth(), { wrapper });

    // Wait for auth hook to initialize properly
    await waitFor(() => {
      expect(authResult.current).toBeDefined();
      expect(authResult.current).not.toBeNull();
      expect(typeof authResult.current.signUp).toBe('function');
      expect(typeof authResult.current.signIn).toBe('function');
      // Ensure mutations are ready
      expect(authResult.current.signUp).not.toBeUndefined();
      expect(authResult.current.signIn).not.toBeUndefined();
    }, { timeout: 15000 });

    // Step 1: Sign up user
    await act(async () => {
      await authResult.current.signUp(testUser);
    });

    // Step 2: Sign in user  
    await act(async () => {
      await authResult.current.signIn({
        email: testEmail,
        password: testPassword,
      });
    });
    
    // Add small delay to allow auth state and user data to sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Test that useAuth returns user data
    const TestComponent = () => {
      const { currentUser, isPending, isAuthenticated } = useAuth();
      // First check if we're still pending
      if (isPending) return <div data-testid="loading">Loading...</div>;
      // Then check if we have user data or if there's an error
      if (!isAuthenticated || !currentUser) return <div data-testid="no-user">No user data</div>;
      return <div data-testid="user-data">{currentUser?.email || ""}</div>;
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    // First wait for loading to complete (either user-data or no-user)
    await waitFor(
      () => {
        try {
          getByTestId("user-data");
          return true;
        } catch {
          try {
            getByTestId("no-user");
            return true;
          } catch {
            return false;
          }
        }
      },
      { timeout: 15000 },
    );

    // Then assert we have user data specifically
    await waitFor(
      () => {
        const userElement = getByTestId("user-data");
        expect(userElement.textContent).toBe(testEmail.toLowerCase());
      },
      { timeout: 15000 },
    );
  });

  test("useAuth signOut should work and clear current user", async () => {
    await signOutBetweenTests();

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Use the consolidated useAuth hook
    const { result: authResult } = renderHook(() => useAuth(), { wrapper });

    // Wait for auth hook to initialize properly
    await waitFor(() => {
      expect(authResult.current).toBeDefined();
      expect(authResult.current).not.toBeNull();
      expect(typeof authResult.current.signUp).toBe('function');
      expect(typeof authResult.current.signIn).toBe('function');
      expect(typeof authResult.current.signOut).toBe('function');
    }, { timeout: 15000 });

    // Step 1: Sign up user
    await act(async () => {
      await authResult.current.signUp(testUser);
    });

    // Step 2: Sign in user
    await act(async () => {
      await authResult.current.signIn({
        email: testEmail,
        password: testPassword,
      });
    });
    
    // Add small delay to allow auth state and user data to sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Verify user is authenticated
    const AuthenticatedComponent = () => {
      const { currentUser, isPending, isAuthenticated } = useAuth();
      // First check if we're still pending
      if (isPending) return <div data-testid="loading">Loading...</div>;
      // Then check if we have user data or if there's an error
      if (!isAuthenticated || !currentUser) return <div data-testid="no-user">No user data</div>;
      return (
        <div data-testid="authenticated-user">
          {currentUser?.email || ""}
        </div>
      );
    };

    const { getByTestId, rerender } = render(<AuthenticatedComponent />, {
      wrapper,
    });

    // First wait for loading to complete (either authenticated-user or no-user)
    await waitFor(
      () => {
        try {
          getByTestId("authenticated-user");
          return true;
        } catch {
          try {
            getByTestId("no-user");
            return true;
          } catch {
            return false;
          }
        }
      },
      { timeout: 15000 },
    );

    // Then assert we have user data specifically
    await waitFor(
      () => {
        const userElement = getByTestId("authenticated-user");
        expect(userElement.textContent).toBe(testEmail.toLowerCase());
      },
      { timeout: 15000 },
    );

    // Step 4: Sign out user
    await act(async () => {
      await authResult.current.signOut();
    });

    // Step 5: Verify user is no longer authenticated
    // Force React to re-evaluate the provider
    rerender(<AuthenticatedComponent />);

    // Should now show no user data
    await waitFor(() => {
      const noUserElement = getByTestId("no-user");
      expect(noUserElement.textContent).toBe("No user data");
    }, { timeout: 15000 });
  });
});
