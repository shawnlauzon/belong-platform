import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, './setup.ts')],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../..'),
    },
  },
});
