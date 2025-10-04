/* eslint-env node */

module.exports = {
	forbidden: [],
	options: {
		includeOnly: [
			"^packages/engine",
			"^packages/contents",
			"^packages/web"
		],
		doNotFollow: {
			path: "node_modules"
		},
		tsPreCompilationDeps: true,
		baseDir: ".",
		tsConfig: {
			fileName: "./tsconfig.base.json"
		}
	}
};
