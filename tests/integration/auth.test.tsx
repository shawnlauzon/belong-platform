import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor, act, render, screen } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  initializeBelong,
  useSignUp,
  useSignIn,
  useCurrentUser,
  useSignOut,
  CurrentUserProvider,
  resetBelongClient,
  getBelongClient,
} from '@belongnetwork/platform';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

describe('Authentication Integration', () => {
  beforeAll(() => {
    // Initialize once for all tests
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });

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

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  afterAll(async () => {
    try {
      const client = getBelongClient();
      if (client?.supabase) {
        // Clean up test users using naming convention
        await client.supabase
          .from('profiles')
          .delete()
          .like('email', 'integration-test-%');
      }
    } catch (error) {
      console.warn('Failed to clean up test users:', error);
    }
  });

  // Keep test isolation for auth tests - each test needs clean auth state
  async function signOutBetweenTests() {
    try {
      const client = getBelongClient();
      if (client?.supabase) {
        await client.supabase.auth.signOut();
      }
    } catch (error) {
      // Ignore signOut errors for clean test isolation
    }
  }

  test('useSignUp should work after calling initializeBelong', async () => {
    await signOutBetweenTests();
    const { result } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
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

  test('useSignIn should work after signing up a user', async () => {
    await signOutBetweenTests();
    // First create a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
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

  test('useCurrentUser should return null when unauthenticated', async () => {
    await signOutBetweenTests();
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      data: null,
    });
  });

  test('useCurrentUser should return user data when authenticated', async () => {
    await signOutBetweenTests();

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Test the hypothesis: Use all hooks in single renderHook (like real app)
    const { result } = renderHook(
      () => {
        return {
          signUp: useSignUp(),
          signIn: useSignIn(),
          currentUser: useCurrentUser(),
        };
      },
      { wrapper }
    );

    // Step 1: Sign up
    await act(async () => {
      await result.current.signUp.mutateAsync(testUser);
    });

    await waitFor(() => expect(result.current.signUp.isPending).toBe(false));

    // Step 2: Sign in
    await act(async () => {
      await result.current.signIn.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });

    await waitFor(() => expect(result.current.signIn.isPending).toBe(false));

    // Debug: Check actual session state after signIn
    const client = getBelongClient();
    const { data: sessionData, error: sessionError } =
      await client.supabase.auth.getSession();
    console.log('🔍 DEBUG: Session state after signIn:', {
      hasSession: !!sessionData.session,
      session: sessionData.session,
      error: sessionError,
      userId: sessionData.session?.user?.id,
      userEmail: sessionData.session?.user?.email,
    });

    // Debug: Try getUser directly
    const { data: userData, error: userError } =
      await client.supabase.auth.getUser();
    console.log('🔍 DEBUG: getUser result after signIn:', {
      hasUser: !!userData.user,
      user: userData.user,
      error: userError,
    });

    // Debug: Check useCurrentUser hook state before waiting
    console.log('🔍 DEBUG: useCurrentUser hook state before waiting:', {
      isLoading: result.current.currentUser.isLoading,
      isPending: result.current.currentUser.isPending,
      isSuccess: result.current.currentUser.isSuccess,
      isError: result.current.currentUser.isError,
      data: result.current.currentUser.data,
      error: result.current.currentUser.error,
    });

    // Step 3: Check current user (should now work - same context!)
    await waitFor(() =>
      expect(result.current.currentUser.isSuccess).toBe(true)
    );

    // Debug: Check useCurrentUser hook state after waiting
    console.log('🔍 DEBUG: useCurrentUser hook state after waiting:', {
      isLoading: result.current.currentUser.isLoading,
      isPending: result.current.currentUser.isPending,
      isSuccess: result.current.currentUser.isSuccess,
      isError: result.current.currentUser.isError,
      data: result.current.currentUser.data,
      error: result.current.currentUser.error,
    });

    expect(result.current.currentUser).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      data: expect.objectContaining({
        email: testEmail.toLowerCase(),
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      }),
    });
  });

  test('useSignOut should work and clear current user', async () => {
    await signOutBetweenTests();
    
    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Create a component that uses TkDodo's pattern with CurrentUserProvider
    const AuthTestComponent = () => {
      const signUp = useSignUp();
      const signIn = useSignIn();
      const signOut = useSignOut();
      
      // This component will be wrapped by CurrentUserProvider, so useCurrentUser will work
      let currentUser;
      try {
        currentUser = useCurrentUser();
      } catch (error) {
        // User is not authenticated yet
        currentUser = null;
      }

      return (
        <div>
          <div data-testid="current-user-email">
            {currentUser?.email || 'not-authenticated'}
          </div>
          <button
            data-testid="sign-up-btn"
            onClick={async () => {
              await signUp.mutateAsync(testUser);
            }}
          >
            Sign Up
          </button>
          <button
            data-testid="sign-in-btn"
            onClick={async () => {
              await signIn.mutateAsync({
                email: testEmail,
                password: testPassword,
              });
            }}
          >
            Sign In
          </button>
          <button
            data-testid="sign-out-btn"
            onClick={async () => {
              await signOut.mutateAsync();
            }}
          >
            Sign Out
          </button>
          <div data-testid="sign-up-status">
            {signUp.isPending ? 'signing-up' : signUp.isSuccess ? 'sign-up-success' : 'sign-up-idle'}
          </div>
          <div data-testid="sign-in-status">
            {signIn.isPending ? 'signing-in' : signIn.isSuccess ? 'sign-in-success' : 'sign-in-idle'}
          </div>
          <div data-testid="sign-out-status">
            {signOut.isPending ? 'signing-out' : signOut.isSuccess ? 'sign-out-success' : 'sign-out-idle'}
          </div>
        </div>
      );
    };

    // Since CurrentUserProvider will only render children when user is authenticated,
    // we need a wrapper that handles the unauthenticated state
    const TestWrapper = () => {
      const [isAuthenticated, setIsAuthenticated] = React.useState(false);
      
      if (!isAuthenticated) {
        return (
          <div>
            <AuthTestComponent />
            <button 
              data-testid="simulate-auth"
              onClick={() => setIsAuthenticated(true)}
            >
              Simulate Auth
            </button>
          </div>
        );
      }
      
      return (
        <CurrentUserProvider>
          <AuthTestComponent />
        </CurrentUserProvider>
      );
    };

    render(<TestWrapper />, { wrapper });

    // Step 1: Sign up user
    await act(async () => {
      screen.getByTestId('sign-up-btn').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('sign-up-status')).toHaveTextContent('sign-up-success')
    );

    // Step 2: Sign in user
    await act(async () => {
      screen.getByTestId('sign-in-btn').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('sign-in-status')).toHaveTextContent('sign-in-success')
    );

    // Step 3: Simulate moving to authenticated state (wrap with CurrentUserProvider)
    await act(async () => {
      screen.getByTestId('simulate-auth').click();
    });

    // Step 4: Verify user is authenticated and email matches
    await waitFor(() =>
      expect(screen.getByTestId('current-user-email')).toHaveTextContent(testEmail.toLowerCase())
    );

    // Step 5: Sign out user
    await act(async () => {
      screen.getByTestId('sign-out-btn').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('sign-out-status')).toHaveTextContent('sign-out-success')
    );

    // Step 6: Verify user is no longer authenticated
    // The CurrentUserProvider should handle the transition to unauthenticated state
    await waitFor(() =>
      expect(screen.getByTestId('current-user-email')).toHaveTextContent('not-authenticated')
    );
  });
});
