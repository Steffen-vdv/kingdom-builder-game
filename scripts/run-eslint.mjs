import { spawn } from 'node:child_process';

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

const npxExecutable = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const child = spawn(npxExecutable, ['eslint', ...finalArgs], {
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
