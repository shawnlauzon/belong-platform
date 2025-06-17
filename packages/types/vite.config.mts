import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Custom plugin to fail build on TypeScript errors
const typescriptChecker = () => ({
  name: 'typescript-checker',
  buildStart() {
    try {
      execSync('pnpm typecheck', { stdio: 'pipe', cwd: __dirname });
    } catch (error) {
      this.error('TypeScript errors found. Build failed.');
    }
  }
});

export default defineConfig({
  plugins: [
    typescriptChecker(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['**/*.test.ts'],
      strictOutput: true,
      noEmitOnError: true
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        database: resolve(__dirname, 'src/database.ts')
      },
      name: 'BelongNetworkTypes',
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        '@belongnetwork/core'
      ]
    },
    sourcemap: true,
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});