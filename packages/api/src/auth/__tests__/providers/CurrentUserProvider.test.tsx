import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BelongProvider, useBelong } from "../../providers/CurrentUserProvider";

// Mock the useAuth hook
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@belongnetwork/core", () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockSupabase = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  };

  const mockMapbox = {
    autocomplete: vi.fn(),
    reverseGeocode: vi.fn(),
  };

  const mockClient = {
    supabase: mockSupabase as any,
    logger: mockLogger as any,
    mapbox: mockMapbox as any,
  };

  return {
    createBelongClient: vi.fn(() => mockClient),
    logger: mockLogger,
  };
});

const mockUseAuth = vi.mocked(await import("../../hooks/useAuth")).useAuth;

describe("BelongProvider", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should provide pending state while fetching user", () => {
    mockUseAuth.mockReturnValue({
      currentUser: undefined,
      isAuthenticated: false,
      isPending: true,
      isError: false,
      error: null,
      signIn: {} as any,
      signUp: {} as any,
      signOut: {} as any,
      updateProfile: {} as any,
    } as any);

    const TestComponent = () => {
      const data = useBelong();
      return (
        <div>
          <div data-testid="pending-state">
            {data.isPending ? "loading" : "not-loading"}
          </div>
          <div data-testid="user-data">
            {data.currentUser?.email || "no-user"}
          </div>
        </div>
      );
    };

    render(
      <BelongProvider
        config={{
          supabaseUrl: "https://test.supabase.co",
          supabaseAnonKey: "test-key",
          mapboxPublicToken: "test-token",
        }}
      >
        <TestComponent />
      </BelongProvider>,
      { wrapper },
    );

    expect(screen.getByTestId("pending-state").textContent).toBe("loading");
    expect(screen.getByTestId("user-data").textContent).toBe("no-user");
  });

  it("should provide error state on fetch failure", () => {
    const error = new Error("Failed to fetch user");
    mockUseAuth.mockReturnValue({
      currentUser: undefined,
      isAuthenticated: false,
      isPending: false,
      isError: true,
      error,
      signIn: {} as any,
      signUp: {} as any,
      signOut: {} as any,
      updateProfile: {} as any,
    } as any);

    const TestComponent = () => {
      const data = useBelong();
      return (
        <div>
          <div data-testid="error-state">
            {data.isError ? "error" : "no-error"}
          </div>
          <div data-testid="error-message">
            {data.error?.message || "no-error-message"}
          </div>
          <div data-testid="user-data">
            {data.currentUser?.email || "no-user"}
          </div>
        </div>
      );
    };

    render(
      <BelongProvider
        config={{
          supabaseUrl: "https://test.supabase.co",
          supabaseAnonKey: "test-key",
          mapboxPublicToken: "test-token",
        }}
      >
        <TestComponent />
      </BelongProvider>,
      { wrapper },
    );

    expect(screen.getByTestId("error-state").textContent).toBe("error");
    expect(screen.getByTestId("error-message").textContent).toBe(
      "Failed to fetch user",
    );
    expect(screen.getByTestId("user-data").textContent).toBe("no-user");
  });

  it("should provide user data to children when successful", () => {
    const userData = {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    };

    mockUseAuth.mockReturnValue({
      currentUser: userData,
      isAuthenticated: true,
      isPending: false,
      isError: false,
      error: null,
      signIn: {} as any,
      signUp: {} as any,
      signOut: {} as any,
      updateProfile: {} as any,
    } as any);

    const TestComponent = () => {
      const data = useBelong();
      return (
        <div>
          <div data-testid="success-state">
            {data.isError ? "error" : "success"}
          </div>
          <div data-testid="user-email">
            {data.currentUser?.email || "no-user"}
          </div>
          <div data-testid="user-name">
            {data.currentUser?.firstName || "no-name"}
          </div>
        </div>
      );
    };

    render(
      <BelongProvider
        config={{
          supabaseUrl: "https://test.supabase.co",
          supabaseAnonKey: "test-key",
          mapboxPublicToken: "test-token",
        }}
      >
        <TestComponent />
      </BelongProvider>,
      { wrapper },
    );

    expect(screen.getByTestId("success-state").textContent).toBe("success");
    expect(screen.getByTestId("user-email").textContent).toBe(
      "test@example.com",
    );
    expect(screen.getByTestId("user-name").textContent).toBe("Test");
  });

  it("should provide null user when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      isAuthenticated: false,
      isPending: false,
      isError: false,
      error: null,
      signIn: {} as any,
      signUp: {} as any,
      signOut: {} as any,
      updateProfile: {} as any,
    } as any);

    const TestComponent = () => {
      const data = useBelong();
      return (
        <div>
          <div data-testid="auth-state">
            {data.currentUser ? "authenticated" : "not-authenticated"}
          </div>
          <div data-testid="user-data">
            {data.currentUser?.email || "no-user"}
          </div>
        </div>
      );
    };

    render(
      <BelongProvider
        config={{
          supabaseUrl: "https://test.supabase.co",
          supabaseAnonKey: "test-key",
          mapboxPublicToken: "test-token",
        }}
      >
        <TestComponent />
      </BelongProvider>,
      { wrapper },
    );

    expect(screen.getByTestId("auth-state").textContent).toBe(
      "not-authenticated",
    );
    expect(screen.getByTestId("user-data").textContent).toBe("no-user");
  });
});
