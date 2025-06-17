import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@belongnetwork/api': path.resolve(__dirname, './packages/api/src'),
      '@belongnetwork/core': path.resolve(__dirname, './packages/core/src'),
      '@belongnetwork/types': path.resolve(__dirname, './packages/types/src'),
      '@belongnetwork/platform': path.resolve(__dirname, './src')
    }
  },
  test: {
    include: ['tests/integration/database/**/*.test.ts', 'tests/integration/database/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/integration/database/setup.ts'],
    testTimeout: 30000, // 30 seconds for database operations
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Run sequentially to avoid conflicts
      }
    }
  }
})