/* eslint-env node */

module.exports = {
	forbidden: [
		{
			name: 'web-to-engine-internals',
			comment:
				'packages/web must only consume the public exports from @kingdom-builder/engine.',
			severity: 'error',
			from: {
				path: '^packages/web/src',
			},
			to: {
				path: '^packages/engine/src/(?!index\\.ts$).+',
			},
		},
		{
			name: 'engine-to-web',
			comment:
				'The engine runtime must not depend on web implementation details.',
			severity: 'error',
			from: {
				path: '^packages/engine/src',
			},
			to: {
				path: '^packages/web/src',
			},
		},
		{
			name: 'engine-to-content-internals',
			comment:
				'The engine consumes content through registries and protocol surfaces only.',
			severity: 'error',
			from: {
				path: '^packages/engine/src',
			},
			to: {
				path: '^packages/contents/src/(?!registries?/|index\\.ts$).+',
			},
		},
	],
	options: {
		includeOnly: ['^packages/engine', '^packages/contents', '^packages/web'],
		doNotFollow: {
			path: 'node_modules',
		},
		tsPreCompilationDeps: true,
		baseDir: '.',
		tsConfig: {
			fileName: './tsconfig.base.json',
		},
	},
};
