import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Base configuration for both build and test
const config = {
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['**/*.test.ts']
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BelongNetworkCore',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'zod',
        'mapbox-gl',
        '@supabase/supabase-js',
        'zustand',
        'loglevel'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          zod: 'zod',
          'mapbox-gl': 'mapboxgl',
          '@supabase/supabase-js': 'supabase',
          zustand: 'zustand',
          loglevel: 'loglevel'
        }
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
};

export default defineConfig(config);
