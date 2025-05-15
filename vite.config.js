import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: true,
    allowedHosts: ['c6a4-102-90-97-66.ngrok-free.app'],
    hmr: {
      clientPort: 443 // Prevent dev server warning from ngrok HTTPS
    },
    proxy: {
      // Proxy API requests to the Express server
      '/api': {
        target: 'http://localhost:5000', 
        changeOrigin: true,
        // secure: false,
      },
    },
  },
  build: {
    // Increase the chunk size limit (in KB) to suppress warnings
    chunkSizeWarningLimit: 5000, 

    rollupOptions: {
      output: {
        // Split node_modules into a separate chunk
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'; // All node_modules go into a chunk named 'vendor'
          }
        },
      },
    },
  },
});
