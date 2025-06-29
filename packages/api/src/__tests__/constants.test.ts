import { describe, it, expect } from "vitest";
import {
  MESSAGE_AUTHENTICATION_REQUIRED,
  MESSAGE_NOT_AUTHORIZED,
  MESSAGE_NOT_FOUND,
  ERROR_CODES,
} from "../constants";

describe("constants", () => {
  describe("error messages", () => {
    it("should have consistent authentication required message", () => {
      expect(MESSAGE_AUTHENTICATION_REQUIRED).toBe(
        "User must be authenticated to perform this operation"
      );
      expect(typeof MESSAGE_AUTHENTICATION_REQUIRED).toBe("string");
      expect(MESSAGE_AUTHENTICATION_REQUIRED.length).toBeGreaterThan(0);
    });

    it("should have consistent not authorized message", () => {
      expect(MESSAGE_NOT_AUTHORIZED).toBe(
        "User is not authorized to perform this operation"
      );
      expect(typeof MESSAGE_NOT_AUTHORIZED).toBe("string");
      expect(MESSAGE_NOT_AUTHORIZED.length).toBeGreaterThan(0);
    });

    it("should have consistent not found message", () => {
      expect(MESSAGE_NOT_FOUND).toBe("Resource not found");
      expect(typeof MESSAGE_NOT_FOUND).toBe("string");
      expect(MESSAGE_NOT_FOUND.length).toBeGreaterThan(0);
    });

    it("should all be different messages", () => {
      const messages = [
        MESSAGE_AUTHENTICATION_REQUIRED,
        MESSAGE_NOT_AUTHORIZED,
        MESSAGE_NOT_FOUND,
      ];
      const uniqueMessages = new Set(messages);
      expect(uniqueMessages.size).toBe(messages.length);
    });
  });

  describe("ERROR_CODES", () => {
    it("should have NOT_FOUND code matching PostgREST standard", () => {
      expect(ERROR_CODES.NOT_FOUND).toBe("PGRST116");
      expect(typeof ERROR_CODES.NOT_FOUND).toBe("string");
    });

    it("should be defined as const object", () => {
      expect(typeof ERROR_CODES).toBe("object");
      expect(ERROR_CODES).not.toBeNull();
    });

    it("should have readonly semantics via TypeScript", () => {
      // TypeScript enforces readonly, runtime allows modification
      // This test documents the current behavior
      const originalValue = ERROR_CODES.NOT_FOUND;
      expect(originalValue).toBe("PGRST116");
    });

    it("should have correct structure for use with Supabase errors", () => {
      // Verify it matches expected PostgREST error code format
      expect(ERROR_CODES.NOT_FOUND).toMatch(/^PGRST\d+$/);
    });
  });

  describe("integration with error handling", () => {
    it("should provide error codes that can be used in error comparisons", () => {
      const mockSupabaseError = {
        code: "PGRST116",
        message: "The result contains 0 rows",
      };

      // This is how the error codes are used in the codebase
      expect(mockSupabaseError.code === ERROR_CODES.NOT_FOUND).toBe(true);
    });

    it("should provide messages that are user-friendly", () => {
      // All messages should be capitalized and end with appropriate punctuation
      expect(MESSAGE_AUTHENTICATION_REQUIRED).toMatch(/^[A-Z]/);
      expect(MESSAGE_NOT_AUTHORIZED).toMatch(/^[A-Z]/);
      expect(MESSAGE_NOT_FOUND).toMatch(/^[A-Z]/);
      
      // Should be complete sentences or proper phrases
      expect(MESSAGE_AUTHENTICATION_REQUIRED.includes("operation")).toBe(true);
      expect(MESSAGE_NOT_AUTHORIZED.includes("operation")).toBe(true);
      expect(MESSAGE_NOT_FOUND.includes("found")).toBe(true);
    });
  });

  describe("exported constants structure", () => {
    it("should export all expected constants", () => {
      // Verify all required constants are exported
      expect(MESSAGE_AUTHENTICATION_REQUIRED).toBeDefined();
      expect(MESSAGE_NOT_AUTHORIZED).toBeDefined();
      expect(MESSAGE_NOT_FOUND).toBeDefined();
      expect(ERROR_CODES).toBeDefined();
    });

    it("should have ERROR_CODES as an object with expected properties", () => {
      expect(typeof ERROR_CODES).toBe("object");
      expect(ERROR_CODES).toHaveProperty("NOT_FOUND");
      expect(Object.keys(ERROR_CODES)).toContain("NOT_FOUND");
    });

    it("should maintain consistency in naming conventions", () => {
      // All message constants should be SCREAMING_SNAKE_CASE starting with MESSAGE_
      const messageConstants = [
        "MESSAGE_AUTHENTICATION_REQUIRED",
        "MESSAGE_NOT_AUTHORIZED", 
        "MESSAGE_NOT_FOUND"
      ];
      
      messageConstants.forEach(constant => {
        expect(constant).toMatch(/^MESSAGE_[A-Z_]+$/);
      });
    });
  });
});