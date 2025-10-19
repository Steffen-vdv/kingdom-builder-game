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
			'@kingdom-builder/protocol': path.resolve(rootDir, '../protocol/src'),
			'@kingdom-builder/contents': path.resolve(rootDir, '../contents/src'),
		},
	},
	server: {
		host: '0.0.0.0',
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				rewrite: (incomingPath) => incomingPath.replace(/^\/api/, ''),
			},
			'/runtime-config': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
	build: {
		rollupOptions: {
			input: path.resolve(rootDir, 'index.html'),
		},
	},
});
