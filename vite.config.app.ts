import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: './', // Serve from the root directory
  publicDir: 'public',
  plugins: [
    tsconfigPaths({
      // Explicitly tell vite-tsconfig-paths to use our tsconfig
      projects: [
        path.resolve(__dirname, './tsconfig.app.json'),
        path.resolve(__dirname, './tsconfig.node.json'),
        path.resolve(__dirname, './tsconfig.base.json'),
      ],
    }),
    react(),
    TanStackRouterVite(),
  ],
  server: {
    port: 5173,
    open: true,
  },
  css: {
    postcss: './postcss.config.js',
  },
  optimizeDeps: {
    include: ['mapbox-gl'],
    exclude: ['lucide-react'],
  },
});
