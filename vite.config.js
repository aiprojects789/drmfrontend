import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://drmbackend-fssdrv599-aisha-kamrans-projects-7a6dddbb.vercel.app/',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
