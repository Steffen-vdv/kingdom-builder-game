import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			root: path.resolve(__dirname, 'tests'),
			include: ['integration/**/*.test.ts'],
			coverage: {
				thresholds: {
					statements: 80,
					branches: 70,
					functions: 80,
					lines: 80,
				},
			},
		},
	}),
);
