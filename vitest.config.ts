import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@boardsmith/engine': path.resolve(__dirname, 'packages/engine/src'),
			'@boardsmith/contents': path.resolve(__dirname, 'packages/contents/src'),
			'@boardsmith/contents-sdk': path.resolve(
				__dirname,
				'packages/contents-sdk/src',
			),
			'@boardsmith/testing': path.resolve(__dirname, 'packages/testing/src'),
			'@boardsmith/protocol': path.resolve(__dirname, 'packages/protocol/src'),
			'@boardsmith/web': path.resolve(__dirname, 'packages/web/src'),
		},
	},
	test: {
		pool: 'threads',
		include: ['**/*.test.ts', '**/*.test.tsx'],
		exclude: ['**/node_modules/**'],
		setupFiles: [
			path.resolve(__dirname, 'tests/setup/react-act-environment.ts'),
		],
		coverage: {
			provider: 'istanbul',
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
