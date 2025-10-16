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

const defaultCoderabbitBinary =
	process.platform === 'win32' ? 'coderabbit.cmd' : 'coderabbit';
const configuredBinary = process.env.CODERABBIT_BIN;
const coderabbitBinary = configuredBinary?.trim()
	? configuredBinary.trim()
	: defaultCoderabbitBinary;

const coderabbitCheck = spawnSync(coderabbitBinary, ['--version'], {
	stdio: 'ignore',
	env: process.env,
});

const missingCoderabbit =
	Boolean(coderabbitCheck.error) && coderabbitCheck.error.code === 'ENOENT';
const failedCoderabbit =
	!missingCoderabbit && (coderabbitCheck.status ?? 1) !== 0;

if (missingCoderabbit || failedCoderabbit) {
	const helpLines = [
		'',
		'Missing CodeRabbit CLI binary.',
		'Install the CLI and ensure the `coderabbit` command resolves before',
		'continuing. Recommended steps:',
		'- Follow the official guide: https://docs.coderabbit.ai/cli',
		'- After installation, verify with `coderabbit --version`',
		'- If the binary lives elsewhere, set CODERABBIT_BIN to its absolute path',
		'',
	];

	for (const line of helpLines) {
		console.error(line);
	}

	process.exit(1);
}
