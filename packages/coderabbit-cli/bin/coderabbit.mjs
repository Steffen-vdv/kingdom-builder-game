#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {string[]} */
const args = process.argv.slice(2);

/**
 * @returns {Promise<string>}
 */
async function loadPackageVersion() {
	const currentFile = fileURLToPath(import.meta.url);
	const packageRoot = path.resolve(path.dirname(currentFile), '..');
	const packagePath = path.join(packageRoot, 'package.json');
	const raw = await readFile(packagePath, 'utf8');
	/** @type {unknown} */
	const parsed = JSON.parse(raw);
	if (
		typeof parsed === 'object' &&
		parsed !== null &&
		'version' in parsed &&
		typeof parsed.version === 'string'
	) {
		return parsed.version;
	}
	return '0.0.0';
}

function printHelp() {
	console.log('Usage: coderabbit <command> [options]');
	console.log('');
	console.log('Available commands:');
	console.log(
		'  review        Run a local static review (stub implementation).',
	);
	console.log('  auth status   Display stub authentication state.');
	console.log('  auth login    Record a stub authentication event.');
	console.log('  version       Print the CLI version.');
	console.log('');
	console.log('Flags:');
	console.log('  -h, --help    Show this message.');
	console.log('  -v, --version Print the CLI version.');
}

function matches(option, ...candidates) {
	return candidates.some((candidate) => option === candidate);
}

async function printVersion() {
	const version = await loadPackageVersion();
	console.log(`CodeRabbit CLI (stub) v${version}`);
}

function handleAuth(subcommand) {
	switch (subcommand) {
		case 'status':
			console.log('Authentication: simulated session active.');
			return 0;
		case 'login':
			console.log('Login: simulated token stored for offline workflows.');
			return 0;
		case 'logout':
			console.log('Logout: simulated token cleared.');
			return 0;
		default:
			console.error(
				'Unknown auth subcommand. Expected status, login, or logout.',
			);
			return 1;
	}
}

function reportUnsupportedWatchFlag(options) {
	if (!Array.isArray(options) || !options.includes('--watch')) {
		return;
	}
	console.warn(
		[
			'Watch mode is not available in the stub CLI.',
			'Running a single pass instead.',
		].join(' '),
	);
}

function handleReview(options) {
	const safeOptions = Array.isArray(options) ? options : [];
	reportUnsupportedWatchFlag(safeOptions);
	console.log('Starting CodeRabbit review (stub implementation).');
	if (safeOptions.length > 0) {
		console.log(`Forwarded options: ${safeOptions.join(' ')}`);
	}
	console.log('No remote review is performed in this environment.');
	console.log('Use the official CodeRabbit CLI for full functionality.');
	return 0;
}

async function main() {
	if (args.length === 0) {
		printHelp();
		return 0;
	}

	if (args.some((value) => matches(value, '-h', '--help'))) {
		printHelp();
		return 0;
	}

	if (
		args.some((value) => matches(value, '-v', '--version')) ||
		matches(args[0], 'version')
	) {
		await printVersion();
		return 0;
	}

	switch (args[0]) {
		case 'review':
			return handleReview(args.slice(1));
		case 'auth':
			return handleAuth(args[1]);
		default:
			console.error(`Unknown command: ${args[0]}`);
			printHelp();
			return 1;
	}
}

const exitCode = await main();
process.exit(exitCode);
