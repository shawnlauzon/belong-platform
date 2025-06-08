import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths({
      // Explicitly tell vite-tsconfig-paths to use our tsconfig
      projects: [
        path.resolve(__dirname, './tsconfig.app.json'),
        path.resolve(__dirname, './tsconfig.node.json'),
        path.resolve(__dirname, './tsconfig.base.json')
      ]
    }),
    react(),
    TanStackRouterVite()
  ],
  resolve: {
    alias: [
      {
        find: '~',
        replacement: path.resolve(__dirname, './packages/core/src')
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './packages/core/src')
      },
      {
        find: '@belongnetwork/core',
        replacement: path.resolve(__dirname, './packages/core/src')
      }
    ]
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  }
});