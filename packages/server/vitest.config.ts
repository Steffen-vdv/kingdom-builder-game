import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
	rootConfig,
	defineConfig({
		test: {
			root: dirname,
			include: ['tests/**/*.test.ts'],
		},
		resolve: {
			alias: {
				'@kingdom-builder/server': path.resolve(dirname, 'src'),
			},
		},
	}),
);
