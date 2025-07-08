import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/test-utils/**',
        '**/__tests__/**',
        '**/__mocks__/**',
      ],
      tsconfigPath: './tsconfig.types.json',
      rollupTypes: false,  // Disable rollup type bundling to prevent renames
      copyDtsFiles: true,
      entryRoot: 'src',
      outDir: 'dist',
      compilerOptions: {
        preserveSymlinks: true,  // Preserve original module names
        noUnusedLocals: false,  // Prevent issues with unused type imports
        noUnusedParameters: false
      },
      logLevel: 'info',
    }),
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        return `${entryName}.${format === 'es' ? 'es.js' : 'cjs.js'}`;
      },
    },
    rollupOptions: {
      external: [
        'react',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'loglevel',
        'nanoid',
        'zod',
      ],
    },
  },
});
