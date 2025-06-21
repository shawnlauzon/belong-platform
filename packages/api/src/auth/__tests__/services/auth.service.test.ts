import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthService } from "../../services/auth.service";
import { setupSupabaseMocks } from "../../../test-utils/mockSetup";

describe("createAuthService", () => {
  let mockSupabase: ReturnType<typeof setupSupabaseMocks>["mockSupabase"];
  let authService: ReturnType<typeof createAuthService>;

  beforeEach(() => {
    const mocks = setupSupabaseMocks();
    mockSupabase = mocks.mockSupabase;
    authService = createAuthService(mockSupabase as any);
  });

  describe("getCurrentUser", () => {
    it("should work correctly after fixing the 'this' context issue", async () => {
      // Mock successful auth user response
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      // Mock the user service response (since it needs to fetch profile data)
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "test-user-id",
                first_name: "Test",
                last_name: "User",
                email: "test@example.com",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      });

      // This should now work without throwing an error
      const result = await authService.getCurrentUser();
      
      // Should return a User object
      expect(result).toBeDefined();
      expect(result?.id).toBe("test-user-id");
      expect(result?.email).toBe("test@example.com");
    });
  });
});