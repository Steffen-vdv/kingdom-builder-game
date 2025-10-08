import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@kingdom-builder/engine': path.resolve(__dirname, 'packages/engine/src'),
			'@kingdom-builder/contents': path.resolve(
				__dirname,
				'packages/contents/src',
			),
			'@kingdom-builder/protocol': path.resolve(
				__dirname,
				'packages/protocol/src',
			),
			'@kingdom-builder/web': path.resolve(__dirname, 'packages/web/src'),
		},
	},
	test: {
		include: ['**/*.test.ts', '**/*.test.tsx'],
		exclude: ['**/node_modules/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: [
				'packages/web/**',
				'packages/contents/**',
				'packages/**/dist/**',
				'scripts/**',
				'**/vitest.config.ts',
				'**/.eslintrc.cjs',
				'**/*.config.ts',
				'**/*.config.cjs',
			],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});
