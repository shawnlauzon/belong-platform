import { test as base } from '@playwright/test'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Extend basic test with shared setup
export const test = base.extend({
  // Add any shared fixtures or setup here
})

export { expect } from '@playwright/test'

// Test data generators
export const testUser = {
  email: () => `test-${Date.now()}@example.com`,
  password: () => 'TestPassword123!',
}

// Environment variable validation
export function validateTestEnvironment() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`)
    console.warn('E2E tests may fail without proper configuration.')
  }
}