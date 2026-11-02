import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      tldts: path.resolve(import.meta.dirname, './src/mocks/dominio-registravel.ts'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'contratos',
              test: /[\\/]src[\\/]contracts[\\/]|[\\/]node_modules[\\/](zod|big\.js)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
