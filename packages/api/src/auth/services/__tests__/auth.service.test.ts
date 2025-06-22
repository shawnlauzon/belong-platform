import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthService } from "../auth.service";
import { createMockUser } from "../../../test-utils/mocks";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock the logger
vi.mock("@belongnetwork/core", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock user service
vi.mock("../../../users/services/user.service", () => ({
  createUserService: vi.fn(() => ({
    fetchUserById: vi.fn(),
  })),
}));

describe("createAuthService", () => {
  let mockSupabase: Partial<SupabaseClient>;
  let authService: ReturnType<typeof createAuthService>;
  let mockUser: ReturnType<typeof createMockUser>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUser = createMockUser();
    
    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
      },
    } as any;

    authService = createAuthService(mockSupabase as SupabaseClient);
  });

  describe("signIn", () => {
    it("should successfully sign in a user", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const mockAuthData = {
        data: {
          user: {
            id: mockUser.id,
            email,
            user_metadata: {
              first_name: mockUser.firstName,
              last_name: mockUser.lastName,
            },
            created_at: mockUser.createdAt.toISOString(),
            updated_at: mockUser.updatedAt.toISOString(),
          },
        },
        error: null,
      };

      vi.mocked(mockSupabase.auth!.signInWithPassword).mockResolvedValue(mockAuthData);

      // Act
      const result = await authService.signIn(email, password);

      // Assert
      expect(mockSupabase.auth!.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
      expect(result).toEqual({
        id: mockUser.id,
        email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it("should throw error when Supabase returns error", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "wrongpassword";
      const error = new Error("Invalid credentials");
      
      vi.mocked(mockSupabase.auth!.signInWithPassword).mockResolvedValue({
        data: { user: null },
        error,
      });

      // Act & Assert
      await expect(authService.signIn(email, password)).rejects.toThrow("Invalid credentials");
      expect(mockSupabase.auth!.signInWithPassword).toHaveBeenCalledWith({
        email,
        password,
      });
    });

    it("should throw error when no user data returned", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      
      vi.mocked(mockSupabase.auth!.signInWithPassword).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(authService.signIn(email, password)).rejects.toThrow(
        "No user data returned from sign in"
      );
    });

    it("should handle unexpected errors during sign in", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const error = new Error("Network error");
      
      vi.mocked(mockSupabase.auth!.signInWithPassword).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.signIn(email, password)).rejects.toThrow("Network error");
    });
  });

  describe("signUp", () => {
    it("should successfully sign up a user with first and last name", async () => {
      // Arrange
      const email = "newuser@example.com";
      const password = "password123";
      const firstName = "John";
      const lastName = "Doe";
      const mockAuthData = {
        data: {
          user: {
            id: mockUser.id,
            email,
            user_metadata: {
              first_name: firstName,
              last_name: lastName,
            },
            created_at: mockUser.createdAt.toISOString(),
            updated_at: mockUser.updatedAt.toISOString(),
          },
        },
        error: null,
      };

      vi.mocked(mockSupabase.auth!.signUp).mockResolvedValue(mockAuthData);

      // Act
      const result = await authService.signUp(email, password, firstName, lastName);

      // Assert
      expect(mockSupabase.auth!.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email,
        firstName,
        lastName,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it("should successfully sign up a user with only first name", async () => {
      // Arrange
      const email = "newuser@example.com";
      const password = "password123";
      const firstName = "Jane";
      const mockAuthData = {
        data: {
          user: {
            id: mockUser.id,
            email,
            user_metadata: {
              first_name: firstName,
            },
            created_at: mockUser.createdAt.toISOString(),
            updated_at: mockUser.updatedAt.toISOString(),
          },
        },
        error: null,
      };

      vi.mocked(mockSupabase.auth!.signUp).mockResolvedValue(mockAuthData);

      // Act
      const result = await authService.signUp(email, password, firstName);

      // Assert
      expect(mockSupabase.auth!.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: undefined,
          },
        },
      });
      expect(result.firstName).toBe(firstName);
      expect(result.lastName).toBeUndefined();
    });

    it("should throw error when Supabase returns error", async () => {
      // Arrange
      const email = "invalid@example.com";
      const password = "password123";
      const firstName = "John";
      const error = new Error("Email already exists");
      
      vi.mocked(mockSupabase.auth!.signUp).mockResolvedValue({
        data: { user: null },
        error,
      });

      // Act & Assert
      await expect(authService.signUp(email, password, firstName)).rejects.toThrow(
        "Email already exists"
      );
    });

    it("should throw error when no user data returned", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const firstName = "John";
      
      vi.mocked(mockSupabase.auth!.signUp).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(authService.signUp(email, password, firstName)).rejects.toThrow(
        "No user data returned from sign up"
      );
    });

    it("should handle unexpected errors during sign up", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const firstName = "John";
      const error = new Error("Network error");
      
      vi.mocked(mockSupabase.auth!.signUp).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.signUp(email, password, firstName)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("signOut", () => {
    it("should successfully sign out", async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.signOut).mockResolvedValue({ error: null });

      // Act
      await authService.signOut();

      // Assert
      expect(mockSupabase.auth!.signOut).toHaveBeenCalled();
    });

    it("should throw error when Supabase returns error", async () => {
      // Arrange
      const error = new Error("Sign out failed");
      vi.mocked(mockSupabase.auth!.signOut).mockResolvedValue({ error });

      // Act & Assert
      await expect(authService.signOut()).rejects.toThrow("Sign out failed");
    });

    it("should handle unexpected errors during sign out", async () => {
      // Arrange
      const error = new Error("Network error");
      vi.mocked(mockSupabase.auth!.signOut).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.signOut()).rejects.toThrow("Network error");
    });
  });

  describe("getCurrentAuthUser", () => {
    it("should return auth user when authenticated", async () => {
      // Arrange
      const mockAuthResponse = {
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      };
      
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue(mockAuthResponse);

      // Act
      const result = await authService.getCurrentAuthUser();

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
      });
    });

    it("should return null when not authenticated", async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await authService.getCurrentAuthUser();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when Supabase returns error", async () => {
      // Arrange
      const error = new Error("Auth session expired");
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error,
      });

      // Act
      const result = await authService.getCurrentAuthUser();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when unexpected error occurs", async () => {
      // Arrange
      const error = new Error("Network error");
      vi.mocked(mockSupabase.auth!.getUser).mockRejectedValue(error);

      // Act
      const result = await authService.getCurrentAuthUser();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("should return complete user when authenticated", async () => {
      // Arrange
      const mockAuthResponse = {
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      };
      
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue(mockAuthResponse);
      
      // Mock the user service directly
      const { createUserService } = await import("../../../users/services/user.service");
      const mockUserServiceInstance = { fetchUserById: vi.fn().mockResolvedValue(mockUser) };
      vi.mocked(createUserService).mockReturnValue(mockUserServiceInstance as any);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserServiceInstance.fetchUserById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return null when not authenticated", async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when user service fails", async () => {
      // Arrange
      const mockAuthResponse = {
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
          },
        },
        error: null,
      };
      
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue(mockAuthResponse);
      
      // Mock the user service to return null
      const { createUserService } = await import("../../../users/services/user.service");
      const mockUserServiceInstance = { fetchUserById: vi.fn().mockResolvedValue(null) };
      vi.mocked(createUserService).mockReturnValue(mockUserServiceInstance as any);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });
  });
});