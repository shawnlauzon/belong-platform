import { describe, it, expect, beforeAll } from "vitest";
import { faker } from "@faker-js/faker";

/**
 * Integration test to verify all expected exports are available
 * from the main @belongnetwork/platform package.
 *
 * This test ensures that:
 * 1. All critical functions are properly exported
 * 2. The package can be imported as consumers would use it
 * 3. No build artifacts contain stale/missing exports
 */
describe("Package Exports Integration", () => {
  let platformModule: any;

  beforeAll(async () => {
    // Import the actual built package, not source files
    // This tests the real consumer experience
    try {
      platformModule = await import("@belongnetwork/platform");
    } catch (error) {
      // Fallback to local dist for development
      platformModule = await import("../../dist/index.es.js");
    }
  });

  describe("Provider Exports", () => {
    it("should export BelongProvider component", () => {
      expect(platformModule.BelongProvider).toBeDefined();
      expect(typeof platformModule.BelongProvider).toBe("function");
    });
  });

  describe("Hook Exports", () => {
    const expectedHooks = [
      "useBelong",
      "useAuth", 
      "useSignIn",
      "useSignUp", 
      "useSignOut",
      "useCommunities",
      "useResources",
      "useEvents",
      "useThanks",
      "useUsers",
    ];

    it.each(expectedHooks)("should export %s hook", (hookName) => {
      expect(platformModule[hookName]).toBeDefined();
      expect(typeof platformModule[hookName]).toBe("function");
    });
  });

  describe("Type Exports", () => {
    const expectedTypes = [
      "ResourceCategory",
      "MeetupFlexibility",
      "EventAttendanceStatus",
    ];

    it.each(expectedTypes)("should export %s type", (typeName) => {
      expect(platformModule[typeName]).toBeDefined();
    });
  });

  describe("Functional Integration", () => {
    it("should provide BelongProvider component", () => {
      const { BelongProvider } = platformModule;

      // Should be a React component (function)
      expect(BelongProvider).toBeDefined();
      expect(typeof BelongProvider).toBe("function");
    });
  });

  describe("Import Patterns", () => {
    it("should support direct imports", async () => {
      const { BelongProvider } = await import("@belongnetwork/platform");
      expect(BelongProvider).toBeDefined();
    });

    it("should support subpath imports for hooks", async () => {
      const hooks = await import("@belongnetwork/platform/hooks");
      expect(hooks.useBelong).toBeDefined();
    });

    it("should support subpath imports for types", async () => {
      const types = await import("@belongnetwork/platform/types");
      expect(types.ResourceCategory).toBeDefined();
    });
  });
});
