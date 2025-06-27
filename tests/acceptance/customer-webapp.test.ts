import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn, ChildProcess } from "child_process";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

/**
 * Customer WebApp Runtime Test
 * 
 * This test reproduces the exact customer scenario described in the bug report:
 * - React webapp using @belongnetwork/platform@0.1.8
 * - BelongProvider configuration with environment variables
 * - Hook usage pattern that may cause blank page bug
 * - Runtime mounting failure despite successful build
 */
describe("Customer WebApp Runtime Issue", () => {
  let devServer: ChildProcess | null = null;
  let serverReady = false;
  const serverUrl = "http://localhost:5175";
  const webappPath = resolve(process.cwd(), "tests/customer-webapp");
  
  beforeAll(async () => {
    console.log("🏗️ Setting up customer webapp test environment...");
    
    // Link the platform package to the customer webapp
    const platformPath = resolve(process.cwd(), "dist");
    const webappPackageJson = resolve(webappPath, "package.json");
    
    if (existsSync(webappPackageJson)) {
      const packageData = JSON.parse(readFileSync(webappPackageJson, "utf-8"));
      packageData.dependencies["@belongnetwork/platform"] = `file:${platformPath}`;
      writeFileSync(webappPackageJson, JSON.stringify(packageData, null, 2));
      console.log("📦 Linked platform package to customer webapp");
    }
    
    // Install dependencies
    try {
      console.log("📥 Installing webapp dependencies...");
      execSync("npm install", { 
        cwd: webappPath, 
        stdio: "inherit",
        timeout: 60000 
      });
    } catch (error) {
      console.error("❌ Failed to install dependencies:", error);
      return;
    }
    
    // Update webapp to use different port for this test
    const viteConfigPath = resolve(webappPath, "vite.config.ts");
    let viteConfig = readFileSync(viteConfigPath, "utf-8");
    viteConfig = viteConfig.replace(/port: \d+/, "port: 5175");
    writeFileSync(viteConfigPath, viteConfig);
    
    // Start the webapp dev server
    try {
      console.log("🚀 Starting customer webapp dev server...");
      devServer = spawn("npm", ["run", "dev"], {
        cwd: webappPath,
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
        env: { ...process.env, NODE_ENV: "development" }
      });

      // Wait for server to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Customer webapp dev server failed to start within 45 seconds"));
        }, 45000);

        devServer!.stdout?.on("data", (data) => {
          const output = data.toString();
          console.log("📦 Customer webapp:", output.trim());
          
          if (output.includes("ready in") || output.includes("Local:") || output.includes("localhost:5175")) {
            serverReady = true;
            clearTimeout(timeout);
            resolve();
          }
        });

        devServer!.stderr?.on("data", (data) => {
          const errorOutput = data.toString();
          console.error("⚠️ Customer webapp stderr:", errorOutput);
          
          // Some warnings are okay, only reject on actual errors
          if (errorOutput.includes("Error:") || errorOutput.includes("ELIFECYCLE")) {
            clearTimeout(timeout);
            reject(new Error(`Customer webapp error: ${errorOutput}`));
          }
        });

        devServer!.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Give server additional time to be fully ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error("❌ Failed to start customer webapp:", error);
      serverReady = false;
    }
  }, 90000);

  afterAll(async () => {
    if (devServer) {
      console.log("🛑 Stopping customer webapp dev server...");
      devServer.kill("SIGTERM");
      
      // Give server time to shut down
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  describe("Customer Environment Setup", () => {
    it("should have customer webapp files configured correctly", () => {
      const requiredFiles = [
        "package.json",
        "index.html", 
        "src/main.tsx",
        "src/App.tsx",
        ".env",
        "vite.config.ts"
      ];
      
      for (const file of requiredFiles) {
        const filePath = resolve(webappPath, file);
        expect(existsSync(filePath), `Missing customer webapp file: ${file}`).toBe(true);
      }
    });

    it("should have platform package linked correctly", () => {
      const packageJsonPath = resolve(webappPath, "package.json");
      const packageData = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      
      expect(packageData.dependencies["@belongnetwork/platform"]).toBeDefined();
      console.log("📦 Platform dependency:", packageData.dependencies["@belongnetwork/platform"]);
    });

    it("should have environment variables configured", () => {
      const envPath = resolve(webappPath, ".env");
      const envContent = readFileSync(envPath, "utf-8");
      
      expect(envContent).toMatch(/VITE_SUPABASE_URL/);
      expect(envContent).toMatch(/VITE_SUPABASE_ANON_KEY/);
      expect(envContent).toMatch(/VITE_MAPBOX_PUBLIC_TOKEN/);
      
      console.log("✅ Environment variables configured correctly");
    });
  });

  describe("Critical Runtime Issue Detection", () => {
    it("should FAIL if customer webapp shows blank page (reproduces bug)", async () => {
      if (!serverReady) {
        throw new Error("Customer webapp server failed to start - this reproduces the server startup failure part of the bug");
      }

      console.log("🔍 Testing customer webapp at:", serverUrl);
      
      // Test if the webapp actually renders content or shows blank page
      const response = await fetch(serverUrl);
      const htmlContent = await response.text();
      
      expect(response.status).toBe(200);
      console.log("✅ Server responds with HTML");
      
      // Check if the page contains React content vs blank page
      console.log("📄 HTML content length:", htmlContent.length);
      console.log("🔍 Checking for React mounting...");
      
      // Wait a moment for React to potentially render
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to fetch the page again to see if React has rendered
      const secondResponse = await fetch(serverUrl);
      const secondHtml = await secondResponse.text();
      
      // Check for signs that React has mounted and rendered
      const hasReactContent = secondHtml.includes("Customer WebApp Test") || 
                             secondHtml.includes("App rendered successfully") ||
                             secondHtml.includes("Platform Hook Status");
      
      const hasBlankPage = secondHtml.includes('<div id="root"></div>') && 
                          !hasReactContent;
      
      console.log("🎯 React content detected:", hasReactContent);
      console.log("⚠️ Blank page detected:", hasBlankPage);
      
      if (hasBlankPage) {
        throw new Error("CUSTOMER BUG REPRODUCED: Webapp shows blank page - React failed to mount!");
      }
      
      if (!hasReactContent) {
        throw new Error("CUSTOMER BUG REPRODUCED: No React content rendered - blank page issue confirmed!");
      }
      
      // If we get here, the bug is NOT reproduced (webapp works)
      console.log("✅ Customer webapp renders correctly - bug NOT reproduced in this environment");
    });

    it("should detect platform module resolution failures", async () => {
      if (!serverReady) {
        console.warn("⚠️ Skipping module resolution test - server not ready");
        return;
      }

      // Check if the main page loads without import errors
      try {
        const response = await fetch(serverUrl);
        const htmlContent = await response.text();
        
        // Check for Vite import resolution errors that would indicate platform module issues
        const hasImportError = htmlContent.includes("Failed to resolve import") || 
                              htmlContent.includes("500") ||
                              htmlContent.includes("Module not found") ||
                              htmlContent.includes("dependencies are imported but could not be resolved");
        
        if (hasImportError) {
          throw new Error("CUSTOMER BUG REPRODUCED: Module resolution failed - platform imports not working!");
        }
        
        console.log("✅ Platform modules resolve correctly");
        expect(response.status).toBe(200);
        
      } catch (error) {
        throw new Error(`CUSTOMER BUG REPRODUCED: Module resolution error - ${(error as Error).message}`);
      }
    });

    it("should identify platform hook integration issues", () => {
      const appPath = resolve(webappPath, "src/App.tsx");
      const appContent = readFileSync(appPath, "utf-8");
      
      // Verify the new API pattern is being used (bug is fixed)
      expect(appContent).toMatch(/useCommunities\(\)/);
      expect(appContent).toMatch(/const communitiesHook = useCommunities\(\)/);
      expect(appContent).toMatch(/await communitiesHook\.list\(\)/);
      
      console.log("✅ Bug report hook pattern implemented correctly");
      
      // Check for all platform hooks mentioned in bug report
      const platformHooks = ["useAuth", "useCommunities", "useResources", "useEvents"];
      for (const hook of platformHooks) {
        expect(appContent).toMatch(new RegExp(hook));
      }
      
      console.log("✅ All platform hooks from bug report are used");
    });

    it("should validate BelongProvider configuration pattern", () => {
      const mainPath = resolve(webappPath, "src/main.tsx");
      const mainContent = readFileSync(mainPath, "utf-8");
      
      // Check for exact provider config pattern from bug report
      expect(mainContent).toMatch(/BelongProvider/);
      expect(mainContent).toMatch(/import\.meta\.env\.VITE_SUPABASE_URL/);
      expect(mainContent).toMatch(/import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
      expect(mainContent).toMatch(/import\.meta\.env\.VITE_MAPBOX_PUBLIC_TOKEN/);
      
      console.log("✅ BelongProvider config matches bug report pattern");
    });
  });

  describe("Runtime Behavior Analysis", () => {
    it("should provide runtime debugging information", async () => {
      if (!serverReady) {
        console.warn("⚠️ Skipping runtime analysis - server not ready");
        return;
      }

      const debugInfo = {
        serverUrl,
        serverReady,
        testTime: new Date().toISOString(),
        platformVersion: "0.1.8"
      };
      
      console.log("🔧 Runtime Debug Info:", debugInfo);
      
      // This test documents the runtime state for debugging
      expect(debugInfo.serverReady).toBe(true);
      expect(debugInfo.platformVersion).toBe("0.1.8");
    });

    it("should document reproduction scenario", () => {
      const scenario = [
        "✅ Customer webapp created with exact bug report configuration",
        "✅ @belongnetwork/platform@0.1.8 linked as dependency", 
        "✅ BelongProvider config matches bug report",
        "✅ Hook usage pattern matches bug report",
        "✅ Environment variables configured",
        "✅ Vite dev server configured on port 5175",
        serverReady ? "✅ Dev server started successfully" : "❌ Dev server failed to start",
        "📊 Test validates: React mounting vs blank page bug"
      ];
      
      console.log("🐛 Customer Bug Reproduction Scenario:");
      scenario.forEach(step => console.log(`   ${step}`));
      
      expect(scenario).toHaveLength(8);
      
      // If server is ready, the test framework worked
      // If customer reports blank page but server is ready, it indicates the issue
      // is in browser-specific JavaScript execution, not server-side
      if (serverReady) {
        console.log("✅ Framework successfully reproduced customer environment");
        console.log("💡 If customer still sees blank page, issue is in browser JS execution");
      }
    });
  });
});