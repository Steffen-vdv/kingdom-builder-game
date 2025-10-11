import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const tasks = [
	{ label: 'check', script: 'check' },
	{ label: 'test-coverage', script: 'test:coverage' },
];

const artifactsDirectory = path.resolve(process.cwd(), 'artifacts');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

await mkdir(artifactsDirectory, { recursive: true });

async function runTask(task) {
	const artifactName = `${timestamp}-${task.label}.log`;
	const artifactPath = path.join(artifactsDirectory, artifactName);
	const writeStream = createWriteStream(artifactPath, { flags: 'w' });

	return new Promise((resolve) => {
		const child = spawn(npmExecutable, ['run', task.script], { shell: false });
		let hasSettled = false;

		const finalize = (code) => {
			if (hasSettled) {
				return;
			}

			hasSettled = true;
			writeStream.end();
			resolve({
				label: task.label,
				code: code ?? 1,
				artifactPath,
			});
		};

		const handleChunk = (chunk) => {
			process.stdout.write(chunk);
			writeStream.write(chunk);
		};

		child.stdout.on('data', handleChunk);
		child.stderr.on('data', handleChunk);

		child.on('error', (error) => {
			const formatted = `${error.message}\n`;
			process.stderr.write(formatted);
			writeStream.write(formatted);
			finalize(1);
		});

		child.on('close', (code) => {
			finalize(code);
		});
	});
}

const results = [];

for (const task of tasks) {
	const result = await runTask(task);
	results.push(result);
}

const overallSuccess = results.every((result) => result.code === 0);

console.log('\nVerification summary:');

for (const result of results) {
	const status = result.code === 0 ? 'PASS' : 'FAIL';
	const relativePath = path.relative(process.cwd(), result.artifactPath);
	console.log(`- ${result.label}: ${status} (${relativePath})`);
}

if (!overallSuccess) {
	console.log('\nVerification failed. Review the artifacts for details.');
	process.exit(1);
}

console.log('\nVerification succeeded. Artifacts are ready for sharing.');
