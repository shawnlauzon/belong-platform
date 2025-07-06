import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      root: path.resolve(__dirname, '../..'),
      projects: [path.resolve(__dirname, '../../tsconfig.base.json')],
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, './setup.ts')],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Suppress console output by default
    silent: process.env.VITEST_VERBOSE !== 'true',
    // Run tests completely serially to avoid test interference
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
});
