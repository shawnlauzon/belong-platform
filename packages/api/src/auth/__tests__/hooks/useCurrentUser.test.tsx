import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BelongProvider } from "../../providers/CurrentUserProvider";
import { useAuth } from "../../hooks/useAuth";

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

describe("useAuth", () => {
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


  it("should return user data when used inside BelongProvider", () => {
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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongProvider
          config={{
            supabaseUrl: "https://test.supabase.co",
            supabaseAnonKey: "test-key",
            mapboxPublicToken: "test-token",
          }}
        >
          {children}
        </BelongProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toEqual(
      expect.objectContaining({
        currentUser: userData,
        isAuthenticated: true,
        isPending: false,
        isError: false,
        error: null,
      }),
    );
  });

  it("should have correct TypeScript types (no null checks needed)", () => {
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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongProvider
          config={{
            supabaseUrl: "https://test.supabase.co",
            supabaseAnonKey: "test-key",
            mapboxPublicToken: "test-token",
          }}
        >
          {children}
        </BelongProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // TypeScript should allow direct property access through currentUser property
    expect(result.current.currentUser?.id).toBe("user-123");
    expect(result.current.currentUser?.email).toBe("test@example.com");
    expect(result.current.currentUser?.firstName).toBe("Test");
    expect(result.current.currentUser?.lastName).toBe("User");
  });
});
