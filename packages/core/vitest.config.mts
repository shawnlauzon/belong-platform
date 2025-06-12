import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    env: {
      VITE_MAPBOX_PUBLIC_TOKEN: 'test-token',
      VITE_SUPABASE_URL: 'http://test-supabase-url.com',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    // Ensure setup file is run before any tests
    sequence: {
      setupFiles: 'list',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
