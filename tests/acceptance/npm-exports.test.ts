import { describe, it, expect, beforeAll } from "vitest";

/**
 * Acceptance Test: Package Export Validation
 * 
 * This test verifies the published package exports work correctly for consumers.
 * It tests the exact scenario described in the bug report for @belongnetwork/platform v0.1.7
 * 
 * Bug Report Reference:
 * - TypeScript compilation errors for useAuth, useCommunities, useResources, useEvents, BelongProvider
 * - Module resolution failures from published package
 * - Missing internal dependencies (@belongnetwork/api, @belongnetwork/types, @belongnetwork/core)
 */
describe("Package Export Acceptance", () => {
  let packageModule: any;
  let importError: Error | null = null;

  beforeAll(async () => {
    try {
      // Force import from published package only - no fallbacks to local dist
      packageModule = await import("@belongnetwork/platform");
    } catch (error) {
      importError = error as Error;
      console.error("Published package import failed:", error);
    }
  });

  describe("Basic Package Import", () => {
    it("should successfully import the published package without errors", () => {
      if (importError) {
        throw new Error(`Published package failed to import: ${importError.message}`);
      }
      expect(packageModule).toBeDefined();
    });

    it("should not have missing internal dependencies", () => {
      // This test will fail if the package references missing @belongnetwork/* packages
      if (importError?.message) {
        expect(importError.message).not.toMatch(/@belongnetwork\/(api|types|core)/);
      }
      // If no import error, this passes (good case)
    });
  });

  describe("Provider Exports", () => {
    it("should export BelongProvider component", () => {
      if (importError) {
        throw new Error(`Cannot test exports due to import failure: ${importError.message}`);
      }
      
      expect(packageModule.BelongProvider).toBeDefined();
      expect(typeof packageModule.BelongProvider).toBe("function");
    });
  });

  describe("Critical Hook Exports", () => {
    const criticalHooks = [
      "useAuth", 
      "useCommunities",
      "useResources", 
      "useEvents"
    ];

    it.each(criticalHooks)("should export %s hook from published package", (hookName) => {
      if (importError) {
        throw new Error(`Cannot test exports due to import failure: ${importError.message}`);
      }

      expect(packageModule[hookName]).toBeDefined();
      expect(typeof packageModule[hookName]).toBe("function");
    });
  });

  describe("TypeScript Compilation Compatibility", () => {
    it("should support destructured imports (TypeScript compilation test)", async () => {
      if (importError) {
        throw new Error(`Cannot test TypeScript compatibility due to import failure: ${importError.message}`);
      }

      // This simulates the exact import pattern from the bug report
      try {
        const { useAuth, useCommunities, useResources, useEvents, BelongProvider } = await import("@belongnetwork/platform");
        
        expect(useAuth).toBeDefined();
        expect(useCommunities).toBeDefined();
        expect(useResources).toBeDefined();
        expect(useEvents).toBeDefined();
        expect(BelongProvider).toBeDefined();
      } catch (error) {
        throw new Error(`Destructured import failed: ${(error as Error).message}`);
      }
    });
  });

  describe("Package Structure Validation", () => {
    it("should have proper export structure without broken paths", () => {
      if (importError) {
        throw new Error(`Cannot validate structure due to import failure: ${importError.message}`);
      }

      // Check that exports don't reference non-existent relative paths
      const moduleKeys = Object.keys(packageModule);
      expect(moduleKeys.length).toBeGreaterThan(0);
      
      // Verify critical exports exist
      expect(moduleKeys).toContain("useAuth");
      expect(moduleKeys).toContain("useCommunities"); 
      expect(moduleKeys).toContain("useResources");
      expect(moduleKeys).toContain("useEvents");
      expect(moduleKeys).toContain("BelongProvider");
    });

    it("should not have empty export objects", () => {
      if (importError) {
        throw new Error(`Cannot validate exports due to import failure: ${importError.message}`);
      }

      // Verify exports are not undefined or empty
      expect(packageModule.useAuth).not.toBeUndefined();
      expect(packageModule.useCommunities).not.toBeUndefined();
      expect(packageModule.useResources).not.toBeUndefined();
      expect(packageModule.useEvents).not.toBeUndefined();
      expect(packageModule.BelongProvider).not.toBeUndefined();
    });
  });

  describe("Runtime Module Resolution", () => {
    it("should resolve all modules without require/import errors", async () => {
      if (importError) {
        throw new Error(`Module resolution failed: ${importError.message}`);
      }

      // Test that the package can be used in a runtime context
      try {
        const { useAuth } = packageModule;
        // Should be callable (even if it throws due to missing context)
        expect(typeof useAuth).toBe("function");
      } catch (error) {
        throw new Error(`Runtime module resolution failed: ${(error as Error).message}`);
      }
    });
  });
});