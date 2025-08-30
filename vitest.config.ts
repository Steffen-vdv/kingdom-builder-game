import path from 'path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({

  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@kingdom-builder/engine': path.resolve(__dirname, 'packages/engine/src'),
    },
  },
  test: {
    exclude: ['**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['packages/web/**', 'packages/contents/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
