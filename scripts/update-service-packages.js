import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const packagesDir = path.join(rootDir, "packages");
const servicePackages = [
  "user-services",
  "resource-services",
  "trust-services",
  "community-services",
];

// Template for package.json updates
const packageJsonUpdates = {
  scripts: {
    build: "vite build --config vite.config.mts",
    dev: "vite build --watch --config vite.config.mts",
    test: "vitest run --config vitest.config.mts",
    "test:watch": "vitest --config vitest.config.mts",
    "test:coverage": "vitest run --coverage --config vitest.config.mts",
    "test:typecheck": "tsc --noEmit -p tsconfig.test.json",
    typecheck: "tsc --noEmit",
  },
  devDependencies: {
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@types/jest": "^29.5.10",
    "@vitejs/plugin-react": "^4.2.1",
    jsdom: "^24.0.0",
    typescript: "^5.3.3",
    vite: "^5.0.12",
    "vite-plugin-dts": "^3.9.1",
    vitest: "^1.2.2",
  },
};

// Function to update package.json
async function updatePackageJson(packagePath) {
  const packageJsonPath = path.join(packagePath, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Update scripts
  pkg.scripts = {
    ...pkg.scripts,
    ...packageJsonUpdates.scripts,
  };

  // Update devDependencies
  pkg.devDependencies = {
    ...pkg.devDependencies,
    ...packageJsonUpdates.devDependencies,
  };

  // Update main and module fields if they exist
  if (!pkg.main) pkg.main = "dist/index.js";
  if (!pkg.module) pkg.module = "dist/index.es.js";
  if (!pkg.types) pkg.types = "dist/index.d.ts";

  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(pkg, null, 2) + "\n",
  );
  console.log(`✅ Updated ${path.basename(packagePath)}/package.json`);
}

// Function to create vite config
async function createViteConfig(packagePath) {
  const viteConfigPath = path.join(packagePath, "vite.config.mts");
  const template = fs.readFileSync(
    path.join(rootDir, "scripts/templates/vite.config.service.mts"),
    "utf8",
  );

  await fs.promises.writeFile(viteConfigPath, template);
  console.log(`✅ Created ${path.basename(packagePath)}/vite.config.mts`);
}

// Function to create vitest config
async function createVitestConfig(packagePath) {
  const vitestConfigPath = path.join(packagePath, "vitest.config.mts");
  const config = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
`;

  await fs.promises.writeFile(vitestConfigPath, config);
  console.log(`✅ Created ${path.basename(packagePath)}/vitest.config.mts`);
}

// Function to create test setup
async function createTestSetup(packagePath) {
  const testDir = path.join(packagePath, "test");
  const setupPath = path.join(testDir, "setup.ts");

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const setupContent = `import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock any global browser APIs if needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
`;

  await fs.promises.writeFile(setupPath, setupContent);
  console.log(`✅ Created ${path.basename(packagePath)}/test/setup.ts`);
}

// Function to create tsconfig.test.json
async function createTsconfigTest(packagePath) {
  const tsconfigTestPath = path.join(packagePath, "tsconfig.test.json");
  const config = {
    extends: "./tsconfig.json",
    compilerOptions: {
      types: ["node", "jsdom", "@testing-library/jest-dom"],
      lib: ["DOM", "DOM.Iterable", "ESNext"],
      jsx: "react-jsx",
    },
    include: ["src/**/*", "test/**/*"],
  };

  await fs.promises.writeFile(
    tsconfigTestPath,
    JSON.stringify(config, null, 2) + "\n",
  );
  console.log(`✅ Created ${path.basename(packagePath)}/tsconfig.test.json`);
}

// Main function
async function main() {
  console.log("🚀 Setting up Vite for service packages...\n");

  for (const pkg of servicePackages) {
    const packagePath = path.join(packagesDir, pkg);

    if (!fs.existsSync(packagePath)) {
      console.log(`⚠️  Package ${pkg} not found, skipping...`);
      continue;
    }

    console.log(`\n📦 Processing ${pkg}...`);

    try {
      // Update package.json
      await updatePackageJson(packagePath);

      // Create config files
      await createViteConfig(packagePath);
      await createVitestConfig(packagePath);
      await createTestSetup(packagePath);
      await createTsconfigTest(packagePath);

      console.log(`✅ Successfully set up ${pkg}\n`);
    } catch (error) {
      console.error(`❌ Error setting up ${pkg}:`, error.message);
    }
  }

  console.log("\n🎉 All service packages have been updated!");
  console.log("Run `pnpm install` to install the new dependencies.");
}

main().catch(console.error);
