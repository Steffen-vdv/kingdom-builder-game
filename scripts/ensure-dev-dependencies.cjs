const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');

const rootDir = resolve(__dirname, '..');

const dependencies = [
	{
		name: 'eslint-plugin-import',
		path: resolve(
			rootDir,
			'node_modules',
			'eslint-plugin-import',
			'package.json',
		),
	},
	{
		name: '@vitest/coverage-v8',
		path: resolve(
			rootDir,
			'node_modules',
			'@vitest',
			'coverage-v8',
			'package.json',
		),
	},
];

const missing = dependencies
	.filter((dependency) => !existsSync(dependency.path))
	.map((dependency) => dependency.name);

if (missing.length > 0) {
	const result = spawnSync('npm', ['install', '--no-save', ...missing], {
		cwd: rootDir,
		stdio: 'inherit',
		env: process.env,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}
