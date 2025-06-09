import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/bscscanapi': {
        target: 'https://api.blpha.xyz',
        changeOrigin: true,
      },
    },
  },
})
