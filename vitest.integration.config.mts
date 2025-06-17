import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['tests/integration/database/setup.ts'],
    globals: true,
    // Run integration tests sequentially to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
})