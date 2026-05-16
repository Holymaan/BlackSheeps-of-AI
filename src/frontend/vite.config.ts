import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:5058',
      '/form': 'http://localhost:5058',
      '/health': 'http://localhost:5058',
    },
  },
})
