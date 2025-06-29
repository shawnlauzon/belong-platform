import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@tanstack/react-query': path.resolve(__dirname, '../../../node_modules/@tanstack/react-query'),
    },
  },
})