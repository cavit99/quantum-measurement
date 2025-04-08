// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Add this configuration for Emotion/Chakra
      jsxRuntime: 'automatic',
      jsxImportSource: '@emotion/react'
    })
  ],
  // optimizeDeps: { // You can probably remove this now
  //   include: ['@chakra-ui/react'],
  // },
})