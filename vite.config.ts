import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/traduzioni')) return 'traduzioni'
          if (id.includes('/node_modules/firebase/')) return 'firebase'
          if (id.includes('/node_modules/@capacitor/')) return 'capacitor'
          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom')) return 'react'
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
})

