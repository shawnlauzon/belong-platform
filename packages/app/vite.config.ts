import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  base: '/',
  publicDir: 'public',
  envDir: resolve(__dirname, '../../'),
  plugins: [
    tailwindcss(),
    tsconfigPaths({
      projects: [
        resolve(__dirname, '../../tsconfig.json'),
        resolve(__dirname, '../../tsconfig.app.json'),
        resolve(__dirname, '../../tsconfig.node.json'),
        resolve(__dirname, '../../tsconfig.base.json'),
      ],
    }),
    react(),
    TanStackRouterVite(),
  ],
  server: {
    port: 5173,
    open: true,
    strictPort: true,
    fs: {
      // Allow serving files from the project root
      allow: ['..'],
    },
  },
  resolve: {
    alias: [
      {
        find: '~',
        replacement: resolve(__dirname, '../core/src'),
      },
      {
        find: '@',
        replacement: resolve(__dirname, 'src'),
      },
      {
        find: '@belongnetwork/core',
        replacement: resolve(__dirname, '../core/src'),
      },
      // Add an alias for the root src directory
      {
        find: 'src',
        replacement: resolve(__dirname, 'src/$1'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
