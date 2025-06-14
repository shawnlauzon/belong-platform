import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
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
    tailwindcss(),
  ],
  server: {
    port: 5174,
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
        find: 'src',
        replacement: resolve(__dirname, 'src'),
      },
      {
        find: '@belongnetwork/core',
        replacement: resolve(__dirname, '../core/src'),
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