import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*', 'packages/*/src/**/*'],
      exclude: ['**/*.test.*', '**/*.spec.*'],
      tsConfigFilePath: './tsconfig.build.json',
      skipDiagnostics: true,
      noEmitOnError: false,
      strictOutput: false,
      logLevel: 'silent'
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        providers: resolve(__dirname, 'src/providers.ts'),
        hooks: resolve(__dirname, 'src/hooks.ts'),
        types: resolve(__dirname, 'src/types.ts')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        return `${entryName}.${format === 'es' ? 'es.js' : 'cjs.js'}`
      }
    },
    rollupOptions: {
      external: [
        'react',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'loglevel',
        'nanoid',
        'zod'
      ],
      output: {
        manualChunks: (id) => {
          // Put everything in the index chunk to ensure global state sharing
          if (id.includes('/packages/')) {
            return 'index';
          }
        }
      }
    }
  }
})