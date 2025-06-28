import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("NPM Package Validation", () => {
  const distPath = join(process.cwd(), "dist");
  
  beforeAll(() => {
    // Ensure dist directory exists
    if (!existsSync(distPath)) {
      throw new Error("dist directory does not exist. Run 'pnpm build' first.");
    }
  });

  describe("Package Structure", () => {
    it("should have all required entry point files", () => {
      const requiredFiles = [
        "index.es.js",
        "index.cjs.js",
        "index.d.ts",
        "hooks.es.js",
        "hooks.cjs.js",
        "hooks.d.ts",
        "types.es.js",
        "types.cjs.js",
        "types.d.ts",
      ];

      for (const file of requiredFiles) {
        const filePath = join(distPath, file);
        expect(existsSync(filePath), `Missing file: ${file}`).toBe(true);
      }
    });
  });

  describe("Type Definitions", () => {
    it("should not contain broken relative paths in index.d.ts", () => {
      const indexDtsPath = join(distPath, "index.d.ts");
      const content = readFileSync(indexDtsPath, "utf-8");
      
      // Check for broken package paths
      expect(content).not.toMatch(/from ['"]\.\.\/packages\//);
      expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/packages\//);
      expect(content).not.toMatch(/import\(['"]\.\.\/packages\//);
      
      // Should not reference src directory
      expect(content).not.toMatch(/from ['"]\.\/src\//);
    });

    it("should have proper exports in index.d.ts", () => {
      const indexDtsPath = join(distPath, "index.d.ts");
      const content = readFileSync(indexDtsPath, "utf-8");
      
      // Check for key exports
      const expectedExports = [
        "useAuth",
        "BelongProvider",
        "useCommunities",
        "useResources",
        "useEvents",
        "useThanks",
        "useUsers",
        "ResourceCategory",
        "User",
        "Community",
        "Resource",
      ];

      for (const exportName of expectedExports) {
        expect(
          content.includes(exportName) || content.includes("export *"),
          `Missing export: ${exportName}`
        ).toBe(true);
      }
    });

    it("should not contain broken relative paths in hooks.d.ts", () => {
      const hooksDtsPath = join(distPath, "hooks.d.ts");
      const content = readFileSync(hooksDtsPath, "utf-8");
      
      expect(content).not.toMatch(/from ['"]\.\.\/packages\//);
      expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/packages\//);
    });

    it("should not contain broken relative paths in types.d.ts", () => {
      const typesDtsPath = join(distPath, "types.d.ts");
      const content = readFileSync(typesDtsPath, "utf-8");
      
      expect(content).not.toMatch(/from ['"]\.\.\/packages\//);
      expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/packages\//);
    });

  });

  describe("JavaScript Bundles", () => {
    it("should have bundled code in index.es.js", () => {
      const indexEsPath = join(distPath, "index.es.js");
      const content = readFileSync(indexEsPath, "utf-8");
      
      // Should have actual code, not just re-exports
      expect(content.length).toBeGreaterThan(1000);
      
      // Should not have relative imports to packages
      expect(content).not.toMatch(/from ['"]\.\.\/packages\//);
    });

    it("should have bundled code in index.cjs.js", () => {
      const indexCjsPath = join(distPath, "index.cjs.js");
      const content = readFileSync(indexCjsPath, "utf-8");
      
      // Should have actual code
      expect(content.length).toBeGreaterThan(1000);
      
      // Should be CommonJS format
      expect(content).toMatch(/exports\./);
    });
  });

  describe("Runtime Import Test", () => {
    it("should be able to import the package", async () => {
      // This test simulates what a consumer would experience
      try {
        // Import from the built package
        const pkg = await import(join(distPath, "index.es.js"));
        
        // Check that exports exist
        expect(pkg.useAuth).toBeDefined();
        expect(pkg.BelongProvider).toBeDefined();
        expect(pkg.useCommunities).toBeDefined();
        expect(pkg.useResources).toBeDefined();
        expect(pkg.ResourceCategory).toBeDefined();
      } catch (error) {
        // If import fails, it means there are unresolved dependencies
        throw new Error(`Failed to import package: ${error}`);
      }
    });
  });

  describe("Package.json Validation", () => {
    it("should have correct export paths in package.json", () => {
      const packageJsonPath = join(process.cwd(), "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      
      // Check main exports
      expect(packageJson.exports["."]).toBeDefined();
      expect(packageJson.exports["."].types).toBe("./dist/index.d.ts");
      expect(packageJson.exports["."].import).toBe("./dist/index.es.js");
      expect(packageJson.exports["."].require).toBe("./dist/index.cjs.js");
      
      // Check subpath exports
      expect(packageJson.exports["./hooks"]).toBeDefined();
      expect(packageJson.exports["./types"]).toBeDefined();
    });
  });
});