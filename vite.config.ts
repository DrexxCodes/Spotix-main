import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      styles: path.resolve(__dirname, './src/styles'),
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
  },
})
