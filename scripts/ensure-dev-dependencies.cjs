const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');

const rootDir = resolve(__dirname, '..');

// Critical dependencies that must exist for lifecycle scripts to work
const criticalDeps = [
	resolve(rootDir, 'node_modules', 'eslint-plugin-import', 'package.json'),
	resolve(rootDir, 'node_modules', 'npm-run-all', 'package.json'),
	resolve(rootDir, 'node_modules', 'cross-env', 'package.json'),
	resolve(rootDir, 'node_modules', '@vitest', 'coverage-v8', 'package.json'),
	resolve(rootDir, 'node_modules', '@tailwindcss', 'postcss', 'package.json'),
];

const anyMissing = criticalDeps.some((dep) => !existsSync(dep));

if (anyMissing) {
	// Run full pnpm install to ensure lockfile consistency
	const result = spawnSync('pnpm', ['install', '--frozen-lockfile'], {
		cwd: rootDir,
		stdio: 'inherit',
		env: process.env,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}
