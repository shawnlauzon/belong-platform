import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Package Validation Test
 * 
 * This test validates the actual package structure and files to identify
 * potential issues that could cause the export problems described in the bug report.
 */
describe("Package Structure Validation", () => {
  const packageRoot = resolve(process.cwd());
  const distPath = resolve(packageRoot, "dist");
  
  describe("Package.json Export Configuration", () => {
    it("should have proper export configuration", () => {
      const packageJsonPath = resolve(packageRoot, "package.json");
      expect(existsSync(packageJsonPath)).toBe(true);
      
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      
      // Verify main export paths exist
      expect(packageJson.exports["."]).toBeDefined();
      expect(packageJson.exports["./hooks"]).toBeDefined();
      expect(packageJson.exports["./types"]).toBeDefined();
      
      // Verify types field points to valid file
      expect(packageJson.types).toBe("./dist/index.d.ts");
    });
  });

  describe("Distribution Files", () => {
    it("should have all required distribution files", () => {
      const requiredFiles = [
        "dist/index.d.ts",
        "dist/index.es.js", 
        "dist/index.cjs.js",
        "dist/hooks.d.ts",
        "dist/hooks.es.js",
        "dist/hooks.cjs.js",
        "dist/types.d.ts",
        "dist/types.es.js",
        "dist/types.cjs.js"
      ];

      for (const file of requiredFiles) {
        const filePath = resolve(packageRoot, file);
        if (!existsSync(filePath)) {
          throw new Error(`Missing required distribution file: ${file}`);
        }
      }
    });

    it("should have non-empty distribution files", () => {
      const criticalFiles = [
        "dist/index.d.ts",
        "dist/hooks.d.ts",
        "dist/types.d.ts"
      ];

      for (const file of criticalFiles) {
        const filePath = resolve(packageRoot, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, "utf-8").trim();
          if (content.length === 0) {
            throw new Error(`Distribution file is empty: ${file}`);
          }
        }
      }
    });
  });

  describe("Type Definition Validation", () => {
    it("should have proper type definitions without broken relative paths", () => {
      const indexDtsPath = resolve(packageRoot, "dist/index.d.ts");
      
      if (existsSync(indexDtsPath)) {
        const content = readFileSync(indexDtsPath, "utf-8");
        
        // Check for broken relative paths to non-existent packages
        const brokenPatterns = [
          /\.\.\/packages\/api\/src/,
          /\.\.\/packages\/types\/src/,
          /\.\.\/packages\/core\/src/
        ];

        for (const pattern of brokenPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Type definition contains broken relative path: ${pattern.source}`);
          }
        }
      }
    });

    it("should export all critical types and functions in type definitions", () => {
      const indexDtsPath = resolve(packageRoot, "dist/index.d.ts");
      
      if (existsSync(indexDtsPath)) {
        const content = readFileSync(indexDtsPath, "utf-8");
        
        const expectedExports = [
          "useAuth",
          "useCommunities", 
          "useResources",
          "useEvents",
          "BelongProvider"
        ];

        for (const exportName of expectedExports) {
          if (!content.includes(exportName)) {
            throw new Error(`Type definition missing export: ${exportName}`);
          }
        }
      }
    });
  });

  describe("Dependency Validation", () => {
    it("should not reference missing internal packages in built files", () => {
      const jsFiles = [
        "dist/index.es.js",
        "dist/index.cjs.js"
      ];

      const problematicReferences = [
        "@belongnetwork/api",
        "@belongnetwork/types", 
        "@belongnetwork/core"
      ];

      for (const file of jsFiles) {
        const filePath = resolve(packageRoot, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, "utf-8");
          
          for (const ref of problematicReferences) {
            if (content.includes(`require("${ref}")`) || content.includes(`from "${ref}"`)) {
              throw new Error(`Built file contains reference to missing package ${ref} in ${file}`);
            }
          }
        }
      }
    });
  });

  describe("Export Completeness", () => {
    it("should verify all exports are properly bundled", async () => {
      try {
        const module = await import("@belongnetwork/platform");
        
        const expectedExports = [
          "useAuth",
          "useCommunities",
          "useResources", 
          "useEvents",
          "BelongProvider"
        ];

        const missingExports = [];
        
        for (const exportName of expectedExports) {
          if (!(exportName in module)) {
            missingExports.push(exportName);
          }
        }

        if (missingExports.length > 0) {
          throw new Error(`Missing exports from package: ${missingExports.join(", ")}`);
        }
      } catch (error) {
        throw new Error(`Package import failed: ${(error as Error).message}`);
      }
    });
  });
});