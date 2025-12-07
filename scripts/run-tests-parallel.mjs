#!/usr/bin/env node
/**
 * Parallel test runner with clean, summarized output.
 * Runs all test suites in parallel (like CI does) and reports results cleanly.
 *
 * Usage:
 *   npm run test:parallel          # Run all test suites in parallel
 *   npm run test:parallel -- -v    # Verbose mode (show full output on failure)
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const npmExecutable = isWindows ? 'npm.cmd' : 'npm';
const verbose =
	process.argv.includes('-v') || process.argv.includes('--verbose');

// Test suites to run in parallel (matches CI workflow)
const testSuites = [
	{ name: 'engine', script: 'test:coverage:engine', label: 'Engine' },
	{ name: 'protocol', script: 'test:coverage:protocol', label: 'Protocol' },
	{ name: 'integration', script: 'test:integration', label: 'Integration' },
	{ name: 'web', script: 'test:web', label: 'Web' },
	{ name: 'server', script: 'test:server', label: 'Server' },
];

const artifactsDir = path.resolve(process.cwd(), 'artifacts');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

await mkdir(artifactsDir, { recursive: true });

/**
 * Run a single test suite and capture output.
 */
async function runTestSuite(suite) {
	const startTime = Date.now();
	const logPath = path.join(
		artifactsDir,
		`${timestamp}-test-${suite.name}.log`,
	);
	let output = '';

	return new Promise((resolve) => {
		const child = spawn(npmExecutable, ['run', suite.script], {
			shell: isWindows,
			env: { ...process.env, FORCE_COLOR: '0' },
		});

		child.stdout.on('data', (chunk) => {
			output += chunk.toString();
		});
		child.stderr.on('data', (chunk) => {
			output += chunk.toString();
		});

		child.on('error', (error) => {
			output += `\nError: ${error.message}\n`;
			resolve({
				suite,
				success: false,
				duration: Date.now() - startTime,
				output,
				logPath,
			});
		});

		child.on('close', async (code) => {
			await writeFile(logPath, output);
			resolve({
				suite,
				success: code === 0,
				duration: Date.now() - startTime,
				output,
				logPath,
			});
		});
	});
}

/**
 * Format duration in human-readable form.
 */
function formatDuration(millis) {
	if (millis < 1000) {
		return `${millis}ms`;
	}
	const seconds = Math.floor(millis / 1000);
	const remaining = millis % 1000;
	if (seconds < 60) {
		return `${seconds}.${Math.floor(remaining / 100)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Extract failure summary from vitest output.
 */
function extractFailureSummary(output) {
	const lines = output.split('\n');
	const failures = [];
	let inFailureBlock = false;

	for (const line of lines) {
		// Look for FAIL indicators
		if (line.includes('FAIL') && line.includes('.test.')) {
			failures.push(line.trim());
			inFailureBlock = true;
		} else if (inFailureBlock && line.includes('AssertionError')) {
			failures.push('  ' + line.trim());
		} else if (inFailureBlock && line.trim() === '') {
			inFailureBlock = false;
		}
	}

	// Also look for the summary line
	const summaryMatch = output.match(/Tests\s+(\d+)\s+failed/);
	if (summaryMatch) {
		failures.push(`\n  ${summaryMatch[0]}`);
	}

	return failures.slice(0, 10); // Limit to first 10 lines
}

// Print header
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║              PARALLEL TEST RUNNER                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log(`Running ${testSuites.length} test suites in parallel...\n`);

const overallStart = Date.now();

// Run all test suites in parallel
const results = await Promise.all(testSuites.map(runTestSuite));

const overallDuration = Date.now() - overallStart;
const passed = results.filter((r) => r.success);
const failed = results.filter((r) => !r.success);

// Print results summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RESULTS SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

for (const result of results) {
	const status = result.success ? '✓ PASS' : '✗ FAIL';
	const color = result.success ? '\x1b[32m' : '\x1b[31m';
	const reset = '\x1b[0m';
	const duration = formatDuration(result.duration);
	console.log(
		`${color}${status}${reset}  ${result.suite.label.padEnd(15)} ${duration}`,
	);

	// Show failure details for failed tests
	if (!result.success) {
		const failureSummary = extractFailureSummary(result.output);
		if (failureSummary.length > 0) {
			for (const line of failureSummary) {
				console.log(`       ${line}`);
			}
		}
		console.log(`       See: ${path.relative(process.cwd(), result.logPath)}`);
		console.log();
	}
}

// Print totals
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(
	`Total: ${passed.length} passed, ${failed.length} failed in ${formatDuration(overallDuration)}`,
);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Print verbose output for failed tests if requested
if (verbose && failed.length > 0) {
	console.log(
		'\n═══════════════════════════════════════════════════════════════',
	);
	console.log('VERBOSE OUTPUT (failed tests)');
	console.log(
		'═══════════════════════════════════════════════════════════════\n',
	);

	for (const result of failed) {
		console.log(
			`\n── ${result.suite.label} ──────────────────────────────────\n`,
		);
		console.log(result.output);
	}
}

// Exit with appropriate code
process.exit(failed.length > 0 ? 1 : 0);
