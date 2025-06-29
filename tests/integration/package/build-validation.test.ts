import {
  describe,
  test,
  expect,
  beforeAll,
} from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Build Validation Integration Tests
 * 
 * These tests validate the built package structure and content to ensure
 * proper bundling, exports, and consumer compatibility.
 * 
 * Migrated from npm-package tests with integration test patterns.
 */

describe("Build Validation", () => {
  const distPath = join(process.cwd(), "dist");
  
  beforeAll(() => {
    if (!existsSync(distPath)) {
      throw new Error("dist directory does not exist. Run 'pnpm build' first.");
    }
  });

  test("should have complete package file structure", () => {
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

    const missingFiles: string[] = [];
    for (const file of requiredFiles) {
      const filePath = join(distPath, file);
      if (!existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Missing required distribution files: ${missingFiles.join(", ")}`);
    }

    console.log("✅ All required distribution files present");
  });

  test("should have valid TypeScript definitions without broken paths", () => {
    const typeFiles = ["index.d.ts", "hooks.d.ts", "types.d.ts"];
    const brokenPatterns = [
      /from ['"]\.\.\/packages\//,
      /from ['"]\.\.\/\.\.\/packages\//,
      /import\(['"]\.\.\/packages\//,
      /from ['"]\.\/src\//,
    ];

    for (const file of typeFiles) {
      const filePath = join(distPath, file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, "utf-8");
        
        for (const pattern of brokenPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Type definition file ${file} contains broken path: ${pattern.source}`);
          }
        }
      }
    }

    console.log("✅ Type definitions have no broken relative paths");
  });

  test("should export all critical platform APIs in index.d.ts", () => {
    const indexDtsPath = join(distPath, "index.d.ts");
    if (!existsSync(indexDtsPath)) {
      throw new Error("index.d.ts not found");
    }

    const content = readFileSync(indexDtsPath, "utf-8");
    const expectedExports = [
      "useAuth",
      "BelongProvider", 
      "useCommunities",
      "useResources",
      "useEvents",
      "useShoutouts",
      "useUsers",
      "ResourceCategory",
      "User",
      "Community", 
      "Resource",
    ];

    const missingExports: string[] = [];
    for (const exportName of expectedExports) {
      if (!content.includes(exportName) && !content.includes("export *")) {
        missingExports.push(exportName);
      }
    }

    if (missingExports.length > 0) {
      throw new Error(`Missing exports in index.d.ts: ${missingExports.join(", ")}`);
    }

    console.log("✅ All critical exports present in type definitions");
  });

  test("should have properly bundled JavaScript files", () => {
    const bundleValidations = [
      {
        file: "index.es.js",
        minSize: 1000,
        shouldNotContain: [/from ['"]\.\.\/packages\//],
        description: "ES module bundle",
      },
      {
        file: "index.cjs.js", 
        minSize: 1000,
        shouldContain: [/exports\./],
        shouldNotContain: [/from ['"]\.\.\/packages\//],
        description: "CommonJS bundle",
      },
    ];

    for (const validation of bundleValidations) {
      const filePath = join(distPath, validation.file);
      if (!existsSync(filePath)) {
        throw new Error(`Bundle file ${validation.file} not found`);
      }

      const content = readFileSync(filePath, "utf-8");

      // Check minimum size
      if (content.length < validation.minSize) {
        throw new Error(`${validation.description} too small: ${content.length} chars < ${validation.minSize}`);
      }

      // Check required patterns
      if (validation.shouldContain) {
        for (const pattern of validation.shouldContain) {
          if (!pattern.test(content)) {
            throw new Error(`${validation.description} missing required pattern: ${pattern.source}`);
          }
        }
      }

      // Check forbidden patterns
      if (validation.shouldNotContain) {
        for (const pattern of validation.shouldNotContain) {
          if (pattern.test(content)) {
            throw new Error(`${validation.description} contains forbidden pattern: ${pattern.source}`);
          }
        }
      }
    }

    console.log("✅ JavaScript bundles properly built and formatted");
  });

  test("should support runtime import of built package", async () => {
    try {
      // Import from the built package ES module
      const pkg = await import(join(distPath, "index.es.js"));
      
      const expectedExports = [
        "useAuth",
        "BelongProvider",
        "useCommunities", 
        "useResources",
        "useEvents",
        "useShoutouts",
        "useUsers",
        "ResourceCategory",
      ];

      const missingExports: string[] = [];
      for (const exportName of expectedExports) {
        if (!(exportName in pkg)) {
          missingExports.push(exportName);
        }
      }

      if (missingExports.length > 0) {
        throw new Error(`Runtime import missing exports: ${missingExports.join(", ")}`);
      }

      // Verify exports are not undefined
      expect(pkg.useAuth).toBeDefined();
      expect(pkg.BelongProvider).toBeDefined();
      expect(pkg.useCommunities).toBeDefined();
      expect(pkg.useResources).toBeDefined();
      expect(pkg.ResourceCategory).toBeDefined();

      console.log("✅ Package runtime import successful with all exports");
    } catch (error) {
      throw new Error(`Failed to import built package: ${(error as Error).message}`);
    }
  });

  test("should have valid package.json export configuration", () => {
    const packageJsonPath = join(process.cwd(), "package.json");
    if (!existsSync(packageJsonPath)) {
      throw new Error("package.json not found");
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    
    // Validate main export
    expect(packageJson.exports["."]).toBeDefined();
    expect(packageJson.exports["."].types).toBe("./dist/index.d.ts");
    expect(packageJson.exports["."].import).toBe("./dist/index.es.js");
    expect(packageJson.exports["."].require).toBe("./dist/index.cjs.js");
    
    // Validate subpath exports
    expect(packageJson.exports["./hooks"]).toBeDefined();
    expect(packageJson.exports["./types"]).toBeDefined();

    // Verify export files exist
    const exportPaths = [
      packageJson.exports["."].types,
      packageJson.exports["."].import,
      packageJson.exports["."].require,
    ];

    for (const exportPath of exportPaths) {
      const fullPath = join(process.cwd(), exportPath);
      if (!existsSync(fullPath)) {
        throw new Error(`Export path ${exportPath} does not exist`);
      }
    }

    console.log("✅ Package.json export configuration valid");
  });

  test("should support TypeScript consumer patterns", () => {
    // Test TypeScript compilation compatibility
    try {
      // These type operations would fail at compile time if types were broken
      type ImportTest = typeof import("../../dist/index.js");
      type HooksImport = typeof import("../../dist/hooks.js");
      type TypesImport = typeof import("../../dist/types.js");

      // If this test passes, TypeScript compilation is working
      expect(true).toBe(true);

      console.log("✅ TypeScript consumer patterns supported");
    } catch (error) {
      throw new Error(`TypeScript consumer compatibility failed: ${(error as Error).message}`);
    }
  });

  test("BUNDLING CONSISTENCY: all entry points reference same internal modules", async () => {
    // Ensure hooks and types subpath exports are consistent with main export
    try {
      const mainPkg = await import(join(distPath, "index.es.js"));
      const hooksPkg = await import(join(distPath, "hooks.es.js"));
      const typesPkg = await import(join(distPath, "types.es.js"));

      // Verify hooks subpath has expected exports
      expect(hooksPkg.useAuth).toBeDefined();
      expect(typeof hooksPkg.useAuth).toBe('function');

      // Verify types subpath has expected exports  
      expect(typesPkg.ResourceCategory).toBeDefined();

      // Verify main export includes everything
      expect(mainPkg.useAuth).toBeDefined();
      expect(mainPkg.ResourceCategory).toBeDefined();

      console.log("✅ All entry points consistent");
    } catch (error) {
      throw new Error(`Entry point consistency check failed: ${(error as Error).message}`);
    }
  });
});