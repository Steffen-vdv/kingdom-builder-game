import path from 'path';
import { defineConfig } from 'vitest/config';

const resolveSrcDir = (pkg: string) =>
	path.resolve(__dirname, 'packages', pkg, 'src');

export default defineConfig({
	resolve: {
		alias: {
			'@kingdom-builder/engine': resolveSrcDir('engine'),
			'@kingdom-builder/engine/': `${resolveSrcDir('engine')}/`,
			'@kingdom-builder/contents': resolveSrcDir('contents'),
			'@kingdom-builder/contents/': `${resolveSrcDir('contents')}/`,
			'@kingdom-builder/protocol': resolveSrcDir('protocol'),
			'@kingdom-builder/protocol/': `${resolveSrcDir('protocol')}/`,
			'@kingdom-builder/web': resolveSrcDir('web'),
			'@kingdom-builder/web/': `${resolveSrcDir('web')}/`,
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
