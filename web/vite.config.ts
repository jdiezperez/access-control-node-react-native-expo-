import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://localhost:5000',
      '/uploads': process.env.VITE_API_URL || 'http://localhost:5000',
    }
  }
})
