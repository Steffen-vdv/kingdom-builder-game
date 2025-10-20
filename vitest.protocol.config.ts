import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			root: path.resolve(__dirname, 'packages/protocol'),
			include: ['tests/**/*.test.ts'],
			coverage: {
				thresholds: {
					statements: 70,
					branches: 70,
					functions: 40,
					lines: 70,
				},
			},
		},
	}),
);
