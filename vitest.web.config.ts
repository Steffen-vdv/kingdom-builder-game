import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			root: path.resolve(__dirname, 'packages/web'),
			include: [
				'tests/**/*.test.ts',
				'src/startup/**/*.test.ts',
				'src/translation/**/__tests__/**/*.test.ts',
			],
		},
	}),
);
