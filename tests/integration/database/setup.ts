import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') })

// Verify required environment variables are set
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_MAPBOX_PUBLIC_TOKEN'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env file.`)
  }
}

// Set up global test utilities
import '@testing-library/jest-dom'