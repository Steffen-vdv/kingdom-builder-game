import { exec as execCallback, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execCallback);
const baseTasks = [
	{ label: 'check', script: 'check' },
	{ label: 'test-coverage', script: 'test:coverage' },
];
const uiDirectories = [
	'packages/contents/',
	'packages/web/src/translation/',
	'packages/web/src/components/',
];

const isWindows = process.platform === 'win32';
const npmExecutable = isWindows ? 'npm.cmd' : 'npm';
const artifactsDirectory = path.resolve(process.cwd(), 'artifacts');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

await mkdir(artifactsDirectory, { recursive: true });

function parseFileList(output) {
	return Array.from(
		new Set(
			output
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean),
		),
	);
}

function parseStatusList(output) {
	return Array.from(
		new Set(
			output
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean)
				.map((line) => line.replace(/^..\s+/, ''))
				.map((line) => {
					const parts = line.split(' -> ');
					return parts[parts.length - 1]?.trim();
				})
				.filter(Boolean),
		),
	);
}

async function getChangedFiles() {
	const candidates = [
		process.env.VERIFICATION_BASE_REF,
		process.env.CHANGE_TARGET,
		'origin/main',
		'origin/master',
		'main',
		'master',
	].filter(Boolean);

	for (const base of candidates) {
		try {
			await exec(`git rev-parse --verify ${base}`);
			const { stdout } = await exec(
				`git diff --name-only --diff-filter=ACMRTUXB ${base}...HEAD`,
			);
			const files = parseFileList(stdout);
			if (files.length > 0) {
				return files;
			}
		} catch {
			continue;
		}
	}

	try {
		const { stdout } = await exec(
			'git diff --name-only --diff-filter=ACMRTUXB HEAD^...HEAD',
		);
		const files = parseFileList(stdout);
		if (files.length > 0) {
			return files;
		}
	} catch {
		// ignore missing parent commits
	}

	try {
		const { stdout } = await exec('git status --porcelain');
		return parseStatusList(stdout);
	} catch {
		return [];
	}
}

function shouldRunUiVerification(files) {
	if (files.length === 0) {
		return false;
	}

	return files.some((file) =>
		uiDirectories.some((directory) => file.startsWith(directory)),
	);
}

async function runTask(task) {
	const artifactName = `${timestamp}-${task.label}.log`;
	const artifactPath = path.join(artifactsDirectory, artifactName);
	const writeStream = createWriteStream(artifactPath, { flags: 'w' });

	return new Promise((resolve) => {
		const child = spawn(npmExecutable, ['run', task.script], {
			shell: isWindows,
			env: process.env,
		});
		let hasSettled = false;
		let errorCode;

		const finalize = (code) => {
			if (hasSettled) {
				return;
			}

			hasSettled = true;
			writeStream.end();
			resolve({
				label: task.label,
				code: typeof code === 'number' ? code : 1,
				artifactPath,
				errorCode,
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
			errorCode = error?.code;
			finalize(1);
		});

		child.on('close', (code, signal) => {
			if (signal && code === null) {
				const formatted = `Process terminated with signal ${signal}\n`;
				process.stderr.write(formatted);
				writeStream.write(formatted);
			}

			finalize(code ?? 1);
		});
	});
}

const results = [];
const tasks = [...baseTasks];
const changedFiles = await getChangedFiles();

if (shouldRunUiVerification(changedFiles)) {
	console.log(
		'Detected UI-affecting file changes; adding verify:ui-change task.',
	);
	tasks.splice(1, 0, {
		label: 'verify-ui-change',
		script: 'verify:ui-change',
	});
}

for (const task of tasks) {
	const result = await runTask(task);
	results.push(result);
}

const overallSuccess = results.every((result) => result.code === 0);
const encounteredEnvironmentFailure = results.some(
	(result) =>
		typeof result.errorCode === 'string' &&
		(result.errorCode === 'ENOENT' || result.errorCode === 'MODULE_NOT_FOUND'),
);

console.log('\nVerification summary:');

for (const result of results) {
	const status = result.code === 0 ? 'PASS' : 'FAIL';
	const relativePath = path.relative(process.cwd(), result.artifactPath);
	const errorSuffix = result.errorCode ? ` [error: ${result.errorCode}]` : '';
	console.log(`- ${result.label}: ${status} (${relativePath})${errorSuffix}`);
}

if (!overallSuccess) {
	console.log('\nVerification failed. Review the artifacts for details.');
	if (encounteredEnvironmentFailure) {
		console.log(
			'Detected environment tooling errors while launching npm tasks.',
		);
		process.exit(2);
	}

	process.exit(1);
} else {
	console.log('\nVerification succeeded. Artifacts are ready for sharing.');
}
