import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useSignIn } from "../useSignIn";
import { createMockUser, createMockAccount } from "../../../test-utils/mocks";
import { BelongProvider } from "../../providers/CurrentUserProvider";

// Mock core to provide createBelongClient
vi.mock("@belongnetwork/core", () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockSupabase = {
    auth: {
      signInWithPassword: vi.fn(),
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

describe("useSignIn", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;
  let mockSupabase: any;
  let mockAccount: ReturnType<typeof createMockAccount>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAccount = createMockAccount();

    // Get the mocked client to access supabase
    const { createBelongClient } = await import("@belongnetwork/core");
    const mockClient = vi.mocked(createBelongClient)();
    mockSupabase = mockClient.supabase;

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const testConfig = {
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-key",
      mapboxPublicToken: "test-token",
    };

    wrapper = ({ children }: { children: any }) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(BelongProvider, { config: testConfig }, children),
      );
  });

  it("should successfully sign in a user", async () => {
    // Arrange
    const credentials = { email: "test@example.com", password: "password123" };
    const mockAuthData = {
      data: {
        user: {
          id: mockAccount.id,
          email: mockAccount.email,
          user_metadata: {
            first_name: mockAccount.firstName,
            last_name: mockAccount.lastName,
          },
          created_at: mockAccount.createdAt.toISOString(),
          updated_at: mockAccount.updatedAt.toISOString(),
        },
      },
      error: null,
    };

    mockSupabase.auth.signInWithPassword.mockResolvedValue(mockAuthData);

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });

    result.current.mutate(credentials);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: credentials.email,
      password: credentials.password,
    });
    expect(result.current.data).toEqual({
      id: mockAccount.id,
      email: mockAccount.email,
      firstName: mockAccount.firstName,
      lastName: mockAccount.lastName,
      fullName: undefined,
      avatarUrl: undefined,
      location: undefined,
      createdAt: mockAccount.createdAt,
      updatedAt: mockAccount.updatedAt,
    });
  });

  it("should handle sign in errors properly", async () => {
    // Arrange
    const credentials = { email: "test@example.com", password: "wrongpassword" };
    const error = new Error("Invalid credentials");
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error,
    });

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });

    result.current.mutate(credentials);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeDefined();
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: credentials.email,
      password: credentials.password,
    });
  });

  it("should handle no user data returned error", async () => {
    // Arrange
    const credentials = { email: "test@example.com", password: "password123" };
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });

    result.current.mutate(credentials);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeDefined();
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: credentials.email,
      password: credentials.password,
    });
  });

  it("should handle network errors during sign in", async () => {
    // Arrange
    const credentials = { email: "test@example.com", password: "password123" };
    const error = new Error("Network error");
    
    mockSupabase.auth.signInWithPassword.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });

    result.current.mutate(credentials);

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeDefined();
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: credentials.email,
      password: credentials.password,
    });
  });

  it("should be idle initially", () => {
    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });

    // Assert
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("should be pending during sign in", async () => {
    // Arrange
    const credentials = { email: "test@example.com", password: "password123" };
    let resolveSignIn: (value: any) => void;
    
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    
    mockSupabase.auth.signInWithPassword.mockReturnValue(signInPromise);

    // Act
    const { result } = renderHook(() => useSignIn(), { wrapper });

    result.current.mutate(credentials);

    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Assert
    expect(result.current.isPending).toBe(true);
    expect(result.current.isIdle).toBe(false);

    // Clean up
    resolveSignIn!({
      data: { user: null },
      error: new Error("Cleanup"),
    });
  });
});