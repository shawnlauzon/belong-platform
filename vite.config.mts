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
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => {
        return `index.${format === 'es' ? 'es.js' : 'cjs.js'}`
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
      ]
    }
  }
})