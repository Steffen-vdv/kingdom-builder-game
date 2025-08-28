import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kingdom-builder/engine': path.resolve(rootDir, '../engine/src'),
    },
  },
  build: {
    rollupOptions: {
      input: path.resolve(rootDir, 'index.html'),
    },
  },
});
