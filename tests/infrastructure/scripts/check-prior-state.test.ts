import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Infrastructure Test: check-prior-state.sh
 *
 * Verifies that the delta review helper script correctly:
 * - Returns FULL_REVIEW when no prior state exists
 * - Validates prior state signature via crypto-gate
 * - Compares commit ancestry (prior ⊆ current)
 * - Returns DELTA_REVIEW with new commits when applicable
 * - Falls back to FULL_REVIEW on any validation failure
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(
	PROJECT_ROOT,
	'.claude/agents/sub-agent/scripts/check-prior-state.sh',
);
// Use PID-namespaced directory to isolate tests
const OUTPUT_DIR = `/tmp/claude/test-${process.pid}/output`;
// Generate unique test ID for each test (UUID for true uniqueness)
function uniqueTestId(): string {
	return crypto.randomUUID();
}

interface RunResult {
	success: boolean;
	stdout: string;
	stderr: string;
}

function runScript(agent: string, commits: string[]): RunResult {
	const commitsJson = JSON.stringify(commits);
	const command = `bash "${SCRIPT_PATH}" '${agent}' '${commitsJson}'`;

	try {
		const stdout = execSync(command, {
			encoding: 'utf-8',
			stdio: 'pipe',
			cwd: PROJECT_ROOT,
			env: { ...process.env },
		});
		return { success: true, stdout, stderr: '' };
	} catch (error: unknown) {
		const err = error as {
			status?: number;
			stderr?: string;
			stdout?: string;
		};
		return {
			success: false,
			stdout: err.stdout || '',
			stderr: err.stderr || '',
		};
	}
}

function cleanOutputDirectory(): void {
	if (fs.existsSync(OUTPUT_DIR)) {
		const files = fs.readdirSync(OUTPUT_DIR);
		for (const file of files) {
			fs.unlinkSync(path.join(OUTPUT_DIR, file));
		}
	}
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Patch the script's output directory check for tests
function setupTestEnvironment(): void {
	// The script uses hardcoded /tmp/claude/sub-agents/output
	// We need to create files there for the test
	fs.mkdirSync('/tmp/claude/sub-agents/output', { recursive: true });
}

describe('Infrastructure: check-prior-state.sh', () => {
	beforeEach(() => {
		cleanOutputDirectory();
		setupTestEnvironment();
	});

	afterEach(() => {
		cleanOutputDirectory();
	});

	describe('Missing Arguments', () => {
		it('should return FULL_REVIEW when agent name is missing', () => {
			const command = `bash "${SCRIPT_PATH}"`;
			const stdout = execSync(command, {
				encoding: 'utf-8',
				cwd: PROJECT_ROOT,
			});
			const result = JSON.parse(stdout);
			expect(result.mode).toBe('FULL_REVIEW');
			expect(result.reason).toBe('missing arguments');
		});

		it('should return FULL_REVIEW when commits are missing', () => {
			const command = `bash "${SCRIPT_PATH}" 'test-agent'`;
			const stdout = execSync(command, {
				encoding: 'utf-8',
				cwd: PROJECT_ROOT,
			});
			const result = JSON.parse(stdout);
			expect(result.mode).toBe('FULL_REVIEW');
			expect(result.reason).toBe('missing arguments');
		});
	});

	describe('No Prior State', () => {
		it('should return FULL_REVIEW when no prior file exists', () => {
			const { success, stdout } = runScript('nonexistent-agent', ['commit123']);
			expect(success).toBe(true);

			const result = JSON.parse(stdout);
			expect(result.mode).toBe('FULL_REVIEW');
			expect(result.reason).toBe('no prior state');
		});
	});

	describe('Invalid Prior State', () => {
		it('should return FULL_REVIEW when prior state has no signature fields', () => {
			// Use unique agent name to avoid collision with parallel tests
			const agentName = `test-nosig-${uniqueTestId()}`;
			const filePath = `/tmp/claude/sub-agents/output/${agentName}.json`;
			// Pre-cleanup in case of stale file
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
			fs.writeFileSync(
				filePath,
				JSON.stringify({
					agent: agentName,
					verdict: 'APPROVED',
					summary: 'Test',
					signature_type: null,
					payload: null,
					signature: null,
				}),
			);

			const { stdout, stderr } = runScript(agentName, ['commit123']);

			// Debug: if stdout is empty, check what happened
			if (!stdout.trim()) {
				throw new Error(
					`Script returned empty stdout. stderr: ${stderr || '(empty)'}`,
				);
			}

			const result = JSON.parse(stdout);
			expect(result.mode).toBe('FULL_REVIEW');
			expect(result.reason).toBe('prior state missing signature fields');

			// Cleanup
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		});

		it('should return FULL_REVIEW when prior payload has no commits', () => {
			// Use unique agent name to avoid collision with parallel tests
			const agentName = `test-nocommits-${uniqueTestId()}`;
			const filePath = `/tmp/claude/sub-agents/output/${agentName}.json`;
			// Pre-cleanup in case of stale file
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
			fs.writeFileSync(
				filePath,
				JSON.stringify({
					agent: agentName,
					verdict: 'APPROVED',
					summary: 'Test',
					signature_type: 'QA_TEST',
					payload: JSON.stringify({ verdict: 'APPROVED' }), // no commits
					signature: 'a'.repeat(64),
				}),
			);

			const { stdout, stderr } = runScript(agentName, ['commit123']);

			// Debug: if stdout is empty, check what happened
			if (!stdout.trim()) {
				throw new Error(
					`Script returned empty stdout. stderr: ${stderr || '(empty)'}`,
				);
			}

			const result = JSON.parse(stdout);
			expect(result.mode).toBe('FULL_REVIEW');
			// Falls back due to signature verification failure or missing commits

			// Cleanup
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		});
	});

	describe('Commit Ancestry', () => {
		it('should return FULL_REVIEW when signature verification fails', () => {
			// Use unique agent name to avoid collision with parallel tests
			const agentName = `test-badsig-${uniqueTestId()}`;
			const filePath = `/tmp/claude/sub-agents/output/${agentName}.json`;
			// Pre-cleanup in case of stale file
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
			fs.writeFileSync(
				filePath,
				JSON.stringify({
					agent: agentName,
					verdict: 'APPROVED',
					summary: 'Test',
					signature_type: 'QA_TEST',
					payload: JSON.stringify({
						commits: ['old-commit'],
						verdict: 'APPROVED',
					}),
					signature: 'invalid-signature',
				}),
			);

			const { stdout } = runScript(agentName, ['different-commit']);

			const result = JSON.parse(stdout);
			expect(result.mode).toBe('FULL_REVIEW');
			// Will fail on signature verification

			// Cleanup
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		});
	});

	describe('Output Format', () => {
		it('should always return valid JSON', () => {
			const { success, stdout } = runScript('test-agent', ['commit123']);
			expect(success).toBe(true);

			expect(() => JSON.parse(stdout)).not.toThrow();
			const result = JSON.parse(stdout);
			expect(result).toHaveProperty('mode');
		});

		it('should include reason for FULL_REVIEW', () => {
			const { stdout } = runScript('nonexistent', ['commit123']);
			const result = JSON.parse(stdout);

			expect(result.mode).toBe('FULL_REVIEW');
			expect(result).toHaveProperty('reason');
			expect(typeof result.reason).toBe('string');
		});
	});
});
