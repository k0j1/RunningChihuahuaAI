import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/RunningChihuahuaAI/',
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
  }
});