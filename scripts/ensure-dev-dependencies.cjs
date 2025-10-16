const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');
const { platform } = require('os');

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
		name: 'npm-run-all',
		path: resolve(rootDir, 'node_modules', 'npm-run-all', 'package.json'),
	},
	{
		name: 'cross-env',
		path: resolve(rootDir, 'node_modules', 'cross-env', 'package.json'),
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
	{
		name: '@tailwindcss/postcss',
		path: resolve(
			rootDir,
			'node_modules',
			'@tailwindcss',
			'postcss',
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

const isWindows = platform() === 'win32';
const coderabbitBinary =
	process.env.CODERABBIT_BIN ?? (isWindows ? 'coderabbit.cmd' : 'coderabbit');
const coderabbitCheck = spawnSync(coderabbitBinary, ['--version'], {
	stdio: 'ignore',
	env: process.env,
	shell: false,
});

if (coderabbitCheck.error?.code === 'ENOENT') {
	console.warn(
		'⚠️  CodeRabbit CLI is not installed or not on your PATH. Install it ' +
			'and rerun this command so `npm run verify` can launch the ' +
			'review step. See docs/tooling/coderabbit-cli.md for help.',
	);
}
