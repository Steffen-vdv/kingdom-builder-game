import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
	root: rootDir,
	plugins: [react()],
	resolve: {
		alias: {
			'@kingdom-builder/contents': path.resolve(rootDir, '../contents/src'),
			'@kingdom-builder/engine': path.resolve(rootDir, '../engine/src'),
			'@kingdom-builder/protocol': path.resolve(rootDir, '../protocol/src'),
		},
	},
	server: {
		host: '0.0.0.0',
	},
	build: {
		rollupOptions: {
			input: path.resolve(rootDir, 'index.html'),
		},
	},
});
