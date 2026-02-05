import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force browser-compatible polyfill instead of Node builtin.
      buffer: 'buffer/',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  server: {
    allowedHosts: [
      'gater-dev.agentix.bot',
      'gater-app.agentix.bot'
    ],
  },
  ssr: {
    noExternal: ['ethereum-identity-kit'],
  },
})
