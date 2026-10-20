import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Dev rejimida /api va /uploads backend'ga proksi qilinadi — CORS va manzil muammosi bo'lmaydi
  const backend = env.VITE_BACKEND_URL || 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/uploads': { target: backend, changeOrigin: true },
      },
    },
  };
});
