// Verify required environment variables are set (loaded by vitest config)
const requiredEnvVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_MAPBOX_PUBLIC_TOKEN",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}. Please check your .env file at tests/integration/.env`,
    );
  }
}

// Set up global test utilities
import "@testing-library/jest-dom";
