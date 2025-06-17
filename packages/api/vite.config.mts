import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
    react(),
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
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BelongNetworkAPI',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'react',
        '@tanstack/react-query',
        '@belongnetwork/core',
        '@belongnetwork/types',
        '@supabase/supabase-js'
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