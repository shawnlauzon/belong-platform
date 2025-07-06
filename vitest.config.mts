import { defineConfig } from "vitest/config";
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // This enables the new JSX transform
      jsxImportSource: 'react',
      babel: {
        plugins: [
          // Ensure JSX runtime is used
          ['@babel/plugin-transform-react-jsx', {
            runtime: 'automatic',
            importSource: 'react'
          }]
        ]
      }
    })
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/integration/setup.ts"],
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "",
      VITE_MAPBOX_PUBLIC_TOKEN: process.env.VITE_MAPBOX_PUBLIC_TOKEN || "",
    },
  },
  resolve: {
    alias: {
      "@belongnetwork/api": "./packages/api/src",
      "@belongnetwork/components": "./packages/components/src",
      "@belongnetwork/core": "./packages/core/src",
      "@belongnetwork/types": "./packages/types/src",
    },
  },
});
