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
  useSignUp,
  useSignIn,
  useBelong,
  useSignOut,
  BelongProvider,
} from "../../dist/index.es.js";

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
      // Instead of clearing all cache, just invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    } catch (error) {
      // Ignore errors during cleanup
    }
  }

  test("useSignUp should work with BelongProvider config", async () => {
    await signOutBetweenTests();

    const { result } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    await act(async () => {
      await result.current.mutateAsync(testUser);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
    });
  });

  test("useSignIn should work after signing up a user", async () => {
    await signOutBetweenTests();

    // First create a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    await act(async () => {
      await signUpResult.current.mutateAsync(testUser);
    });

    await waitFor(() => expect(signUpResult.current.isPending).toBe(false));

    // Now test sign in
    const { result } = renderHook(() => useSignIn(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
    });
  });

  test("useBelong should render error when unauthenticated", async () => {
    await signOutBetweenTests();

    const TestComponent = () => {
      const data = useBelong();
      if (data.isError || !data.currentUser) {
        return <div data-testid="no-user">No user</div>;
      }
      return <div data-testid="user-data">{data.currentUser.email}</div>;
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    // Wait for the component to render with no user
    await waitFor(() => {
      expect(getByTestId("no-user")).toBeDefined();
    });
  });

  test("useBelong should return user data when authenticated", async () => {
    await signOutBetweenTests();

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Step 1: Create auth mutations with BelongProvider
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });
    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper });

    // Step 2: Sign up user
    await act(async () => {
      await signUpResult.current.mutateAsync(testUser);
    });
    await waitFor(() => expect(signUpResult.current.isSuccess).toBe(true));

    // Step 3: Sign in user
    await act(async () => {
      await signInResult.current.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });
    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Step 4: Test BelongProvider with authenticated user
    const TestComponent = () => {
      const data = useBelong();
      if (data.isPending) return <div data-testid="loading">Loading...</div>;
      return <div data-testid="user-data">{data.currentUser?.email || ""}</div>;
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    // Should eventually show authenticated user data
    await waitFor(
      () => {
        const userElement = getByTestId("user-data");
        expect(userElement.textContent).toBe(testEmail.toLowerCase());
      },
      { timeout: 15000 },
    );
  });

  test("useSignOut should work and clear current user", async () => {
    await signOutBetweenTests();

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Step 1: Set up auth hooks using the same shared wrapper
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });
    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper });
    const { result: signOutResult } = renderHook(() => useSignOut(), {
      wrapper,
    });

    // Step 2: Sign up user
    await act(async () => {
      await signUpResult.current.mutateAsync(testUser);
    });
    await waitFor(() => expect(signUpResult.current.isSuccess).toBe(true));

    // Step 3: Sign in user
    await act(async () => {
      await signInResult.current.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });
    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Step 4: Verify user is authenticated with BelongProvider
    const AuthenticatedComponent = () => {
      const data = useBelong();
      if (data.isPending) return <div data-testid="loading">Loading...</div>;
      return (
        <div data-testid="authenticated-user">
          {data.currentUser?.email || ""}
        </div>
      );
    };

    const { getByTestId, rerender } = render(<AuthenticatedComponent />, {
      wrapper,
    });

    await waitFor(
      () => {
        const userElement = getByTestId("authenticated-user");
        expect(userElement.textContent).toBe(testEmail.toLowerCase());
      },
      { timeout: 15000 },
    );

    // Step 5: Sign out user
    await act(async () => {
      await signOutResult.current.mutateAsync();
    });
    await waitFor(() => expect(signOutResult.current.isSuccess).toBe(true));

    // Step 6: Verify user is no longer authenticated (TkDodo's pattern should invalidate cache)
    // Force React to re-evaluate the provider
    rerender(<AuthenticatedComponent />);

    // Should now show no user data (empty or null email)
    await waitFor(() => {
      const userElement = getByTestId("authenticated-user");
      expect(userElement.textContent).toBe(""); // Empty since no user
    });
  });
});
