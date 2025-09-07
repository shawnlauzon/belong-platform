import dotenv from 'dotenv';
import path from 'path';
import '@testing-library/jest-dom';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test.local') });

// Verify required env vars
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
