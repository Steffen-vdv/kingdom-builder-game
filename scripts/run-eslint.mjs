import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const rawArgs = process.argv.slice(2);
const hasExplicitTarget = rawArgs.some((arg, index) => {
	if (arg === '--') {
		return index < rawArgs.length - 1;
	}

	return !arg.startsWith('-');
});

const finalArgs = hasExplicitTarget ? rawArgs : ['.', ...rawArgs];
const env = {
	...process.env,
	ESLINT_USE_FLAT_CONFIG: process.env.ESLINT_USE_FLAT_CONFIG ?? 'true',
};

const require = createRequire(import.meta.url);
const eslintPackagePath = require.resolve('eslint/package.json');
const eslintBin = join(dirname(eslintPackagePath), 'bin', 'eslint.js');

const child = spawn(process.execPath, [eslintBin, ...finalArgs], {
	stdio: 'inherit',
	env,
});

child.on('error', (error) => {
	console.error(error);
	process.exit(1);
});

child.on('exit', (code, signal) => {
	if (signal) {
		console.error(`eslint terminated with signal ${signal}`);
		process.exit(1);
	}

	process.exit(code ?? 1);
});
