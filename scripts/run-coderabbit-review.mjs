import { spawn } from 'node:child_process';
import process from 'node:process';

const defaultBinary =
	process.platform === 'win32' ? 'coderabbit.cmd' : 'coderabbit';
const coderabbitBinary = process.env.CODERABBIT_BIN ?? defaultBinary;
const forwardedArgs = process.argv.slice(2);
const args = forwardedArgs.length > 0 ? forwardedArgs : ['review'];

const child = spawn(coderabbitBinary, args, {
	stdio: 'inherit',
	shell: false,
});

child.on('error', (error) => {
	if (error?.code === 'ENOENT') {
		console.error(
			'CodeRabbit CLI is not installed. ' +
				'Install it and ensure it is on your PATH.',
		);
	} else if (error?.message) {
		console.error(error.message);
	}
	process.exit(1);
});

child.on('close', (code, signal) => {
	if (signal && code === null) {
		console.error(`CodeRabbit CLI exited due to signal ${signal}.`);
		process.exit(1);
	}
	process.exit(code ?? 1);
});
