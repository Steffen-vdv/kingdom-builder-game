import { spawn } from 'node:child_process';

const tasks = [
	{ label: 'generate snapshots', script: 'generate:snapshots' },
	{ label: 'ui tests', script: 'test:ui' },
];

const isWindows = process.platform === 'win32';
const npmExecutable = isWindows ? 'npm.cmd' : 'npm';

function runTask(task) {
	return new Promise((resolve, reject) => {
		const child = spawn(npmExecutable, ['run', task.script], {
			shell: isWindows,
			stdio: 'inherit',
			env: process.env,
		});

		child.on('error', (error) => {
			reject(error);
		});

		child.on('close', (code, signal) => {
			if (signal && code === null) {
				reject(
					new Error(`npm run ${task.script} terminated with signal ${signal}`),
				);
				return;
			}

			if (code !== 0) {
				reject(new Error(`npm run ${task.script} exited with code ${code}`));
				return;
			}

			resolve();
		});
	});
}

for (const task of tasks) {
	try {
		console.log(`\n▶ Running ${task.label}...`);
		await runTask(task);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`\n${task.label} failed: ${message}`);
		process.exit(1);
	}
}

console.log('\nAll UI verification tasks completed successfully.');
