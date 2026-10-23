import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { siteUrl } from './scripts/site-url.mjs';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl) }
  ],
  define: { __SITE_URL__: JSON.stringify(siteUrl) },
  server: {
    port: 5173,
    proxy: { '/api': process.env.API_URL || 'http://localhost:4000' }
  },
  preview: { port: 4173, proxy: { '/api': process.env.API_URL || 'http://localhost:4000' } },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
          motion: ['framer-motion']
        }
      }
    }
  }
});
