import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from current directory
config({ path: resolve(__dirname, '.env.local') });

export default defineConfig({
  root: resolve(__dirname, '../../'),
  test: {
    include: [
      'tests/integration/communities/**/*.test.{ts,tsx}',
      'tests/integration/resources/**/*.test.{ts,tsx}',
      'tests/integration/users/**/*.test.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/setup/**',
      '**/*.backup/**',
      '**/integration-backup/**',
      '**/acceptance/**',
      '**/npm-package/**',
      '**/customer-webapp/**',
      'packages/**',
      // Temporarily skip these test directories
      'tests/integration/auth/**',
      'tests/integration/conversations/**',
      'tests/integration/cross-features/**',
      'tests/integration/error-handling/**',
      'tests/integration/events/**',
      'tests/integration/shoutouts/**',
      'tests/integration/workflows/**',
      'tests/integration/helpers/test-utilities.test.ts',
      'tests/integration/basic-smoke.test.ts',
    ],
    environment: 'jsdom',
    setupFiles: ['tests/integration/setup/test-environment.ts'],
    globals: true,
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    // Run tests sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Silent by default, can be overridden with VITEST_VERBOSE=true
    silent: process.env.VITEST_VERBOSE !== 'true',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@tests': resolve(__dirname, '../'),
    },
  },
});
