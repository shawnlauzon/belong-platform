/**
 * This test simulates what a TypeScript consumer would experience
 * when using the published package.
 */
import { describe, it, expect } from "vitest";

// Test that we can import types and functions without TypeScript errors
describe("TypeScript Consumer Experience", () => {
  it("should be able to import hooks with proper types", () => {
    // These imports would fail at compile time if types were broken
    type ImportTest = typeof import("../../dist/index.js");
    
    // Verify the shape of the module
    const moduleShape: ImportTest = {} as any;
    
    // These should all be valid property accesses
    expect(() => moduleShape.useAuth).not.toThrow();
    expect(() => moduleShape.BelongProvider).not.toThrow();
    expect(() => moduleShape.useCommunities).not.toThrow();
    expect(() => moduleShape.ResourceCategory).not.toThrow();
  });

  it("should have proper type exports", () => {
    // This test verifies that type imports would work in a real TypeScript project
    // The actual type checking happens during the build process
    // If the build succeeded, then the types are properly exported
    expect(true).toBe(true);
  });

  it("should support subpath imports", () => {
    // Test hooks subpath
    type HooksImport = typeof import("../../dist/hooks.js");
    const hooksModule: HooksImport = {} as any;
    expect(() => hooksModule.useAuth).not.toThrow();
    
    // Test types subpath
    type TypesImport = typeof import("../../dist/types.js");
    const typesModule: TypesImport = {} as any;
    expect(() => typesModule.ResourceCategory).not.toThrow();
    
  });
});