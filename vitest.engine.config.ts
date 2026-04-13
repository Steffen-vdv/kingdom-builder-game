import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			root: path.resolve(__dirname, 'packages/engine'),
			include: ['tests/**/*.test.ts'],
			setupFiles: [],
			pool: 'threads',
			coverage: {
				thresholds: {
					statements: 80,
					branches: 78.4,
					functions: 80,
					lines: 80,
				},
			},
		},
	}),
);
