import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { User, UserFilter } from "@belongnetwork/types";
import { useUsers } from "../hooks/useUsers";

// Mock the auth provider
vi.mock("../../auth/providers/CurrentUserProvider", () => ({
  useSupabase: vi.fn(),
}));

// Mock the user service
vi.mock("../services/user.service", () => ({
  createUserService: vi.fn(),
}));

import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createUserService } from "../services/user.service";

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateUserService = vi.mocked(createUserService);
const mockFetchUsers = vi.fn();
const mockUpdateUser = vi.fn();
const mockDeleteUser = vi.fn();

describe("useUsers consolidated hook", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateUserService.mockReturnValue({
      fetchUsers: mockFetchUsers,
      updateUser: mockUpdateUser,
      deleteUser: mockDeleteUser,
    } as any);
  });

  it("should pass filters to fetchUsers via retrieve function", async () => {
    // Arrange
    const filters: UserFilter = { communityId: "community-1" };
    const mockUsers: User[] = [
      {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });
    
    // Manually retrieve data with filters
    const retrievedData = await result.current.retrieve(filters);

    // Assert
    expect(retrievedData).toEqual(mockUsers);
    expect(mockFetchUsers).toHaveBeenCalledWith(filters);
  });

  it("should not fetch data automatically and have correct initial status", () => {
    // Arrange
    const mockUsers: User[] = [];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert - Data should not be fetched automatically and status should be correct
    expect(mockFetchUsers).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false); // Query is idle (enabled: false = not pending)
    expect(result.current.isFetching).toBe(false);
  });

  it("should allow retrieve to be called without filters", async () => {
    // Arrange
    const mockUsers: User[] = [];
    mockFetchUsers.mockResolvedValue(mockUsers);

    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchUsers).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve without filters
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockUsers);
    expect(mockFetchUsers).toHaveBeenCalledWith(undefined);
    expect(mockFetchUsers).toHaveBeenCalledTimes(1);
  });

  it("should have retrieve function available", () => {
    // Act
    const { result } = renderHook(() => useUsers(), { wrapper });

    // Assert
    expect(result.current.retrieve).toBeDefined();
    expect(typeof result.current.retrieve).toBe("function");
  });
});