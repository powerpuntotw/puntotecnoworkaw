import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router'],
          'vendor-appwrite': ['appwrite'],
          'vendor-ui':       ['lucide-react', 'react-hot-toast'],
          'vendor-charts':   ['recharts'],
          'vendor-motion':   ['framer-motion'],
        }
      }
    }
  }
})
