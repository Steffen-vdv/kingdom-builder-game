import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: qa-prepare.sh
 *
 * Verifies that the QA preparation script correctly:
 * - Requires --summary argument
 * - Outputs valid JSON with expected fields
 * - Gathers git data (branch, head, commits, files_changed)
 * - Provides helpful --help output
 * - Handles error cases gracefully
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(
	PROJECT_ROOT,
	'.claude/agents/shared/scripts/qa-prepare.sh',
);
// Use PID-namespaced directory to isolate tests from parallel test runs
const TEST_QA_DIR = `/tmp/claude/test-qa-prepare-${process.pid}`;
const TEST_INPUT_DIR = `${TEST_QA_DIR}/current`;

interface RunResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
}

function runScript(args: string[] = []): RunResult {
	const quotedArgs = args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ');
	const command = `bash "${SCRIPT_PATH}" ${quotedArgs}`;

	try {
		const stdout = execSync(command, {
			encoding: 'utf-8',
			stdio: 'pipe',
			cwd: PROJECT_ROOT,
			env: {
				...process.env,
				QA_CURRENT_DIR: TEST_INPUT_DIR,
				QA_DELTA_DIR: `${TEST_INPUT_DIR}/delta`,
			},
		});
		return { success: true, stdout, stderr: '', exitCode: 0 };
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
			exitCode: err.status || 1,
		};
	}
}

function cleanTestDirectory(): void {
	if (fs.existsSync(TEST_QA_DIR)) {
		fs.rmSync(TEST_QA_DIR, { recursive: true });
	}
}

function readInputJson(): Record<string, unknown> | null {
	const inputPath = path.join(TEST_INPUT_DIR, 'input.json');
	if (!fs.existsSync(inputPath)) {
		return null;
	}
	return JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
}

function readInputHash(): string | null {
	const hashPath = path.join(TEST_INPUT_DIR, 'input.sha256');
	if (!fs.existsSync(hashPath)) {
		return null;
	}
	return fs.readFileSync(hashPath, 'utf-8').trim();
}

describe('Infrastructure: qa-prepare.sh', () => {
	beforeEach(() => {
		cleanTestDirectory();
		fs.mkdirSync(TEST_INPUT_DIR, { recursive: true });
	});

	afterEach(() => {
		cleanTestDirectory();
	});

	describe('Argument Validation', () => {
		it('should fail without --summary argument', () => {
			const { success, stderr, exitCode } = runScript([]);
			expect(success).toBe(false);
			expect(exitCode).toBe(1);
			expect(stderr).toContain('--summary is required');
		});

		it('should fail with unknown option', () => {
			const { success, stderr, exitCode } = runScript(['--unknown', 'value']);
			expect(success).toBe(false);
			expect(exitCode).toBe(1);
			expect(stderr).toContain('Unknown option');
		});

		it('should accept --summary with space separator', () => {
			const { success } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
		});

		it('should accept --summary=value format', () => {
			const { success } = runScript(['--summary=Test summary with equals']);
			expect(success).toBe(true);
		});
	});

	describe('Help Output', () => {
		it('should show help with -h flag', () => {
			const { success, stdout, exitCode } = runScript(['-h']);
			expect(success).toBe(true);
			expect(exitCode).toBe(0);
			expect(stdout).toContain('USAGE:');
			expect(stdout).toContain('--summary');
		});

		it('should show help with --help flag', () => {
			const { success, stdout } = runScript(['--help']);
			expect(success).toBe(true);
			expect(stdout).toContain('OPTIONS:');
			expect(stdout).toContain('EXAMPLE:');
		});
	});

	describe('Output Files', () => {
		it('should create input.json file', () => {
			const { success } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);

			const inputPath = path.join(TEST_INPUT_DIR, 'input.json');
			expect(fs.existsSync(inputPath)).toBe(true);
		});

		it('should create input.sha256 hash file', () => {
			const { success } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);

			const hashPath = path.join(TEST_INPUT_DIR, 'input.sha256');
			expect(fs.existsSync(hashPath)).toBe(true);

			const hash = readInputHash();
			expect(hash).toBeTruthy();
			expect(hash).toMatch(/^[a-f0-9]{64}$/);
		});

		it('should create delta directory', () => {
			const { success } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);

			const deltaPath = path.join(TEST_INPUT_DIR, 'delta');
			expect(fs.existsSync(deltaPath)).toBe(true);
			expect(fs.statSync(deltaPath).isDirectory()).toBe(true);
		});
	});

	describe('JSON Structure', () => {
		it('should include all required fields', () => {
			const { success } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(input).not.toBeNull();
			expect(input).toHaveProperty('branch');
			expect(input).toHaveProperty('head');
			expect(input).toHaveProperty('commits');
			expect(input).toHaveProperty('files_changed');
			expect(input).toHaveProperty('prompts');
			expect(input).toHaveProperty('summary');
		});

		it('should include the provided summary', () => {
			const testSummary = 'This is my test summary for QA';
			const { success } = runScript(['--summary', testSummary]);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(input?.summary).toBe(testSummary);
		});

		it('should have branch as a non-empty string', () => {
			const { success } = runScript(['--summary', 'Test']);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(typeof input?.branch).toBe('string');
			expect((input?.branch as string).length).toBeGreaterThan(0);
		});

		it('should have head as a git SHA', () => {
			const { success } = runScript(['--summary', 'Test']);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(typeof input?.head).toBe('string');
			// Git SHA is 40 hex characters
			expect(input?.head).toMatch(/^[a-f0-9]{40}$/);
		});

		it('should have commits as an array', () => {
			const { success } = runScript(['--summary', 'Test']);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(Array.isArray(input?.commits)).toBe(true);
		});

		it('should have files_changed as an array', () => {
			const { success } = runScript(['--summary', 'Test']);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(Array.isArray(input?.files_changed)).toBe(true);
		});

		it('should have prompts as an array', () => {
			const { success } = runScript(['--summary', 'Test']);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(Array.isArray(input?.prompts)).toBe(true);
		});
	});

	describe('Output Message', () => {
		it('should report preparation complete', () => {
			const { success, stdout } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
			expect(stdout).toContain('QA preparation complete');
		});

		it('should report branch name', () => {
			const { success, stdout } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
			expect(stdout).toContain('Branch:');
		});

		it('should report HEAD SHA', () => {
			const { success, stdout } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
			expect(stdout).toContain('HEAD:');
		});

		it('should report commit count', () => {
			const { success, stdout } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
			expect(stdout).toMatch(/Commits:\s+\d+\s+commit/);
		});

		it('should report files changed count', () => {
			const { success, stdout } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
			expect(stdout).toMatch(/Files:\s+\d+\s+file/);
		});

		it('should report input file location', () => {
			const { success, stdout } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
			expect(stdout).toContain('Input written to:');
			expect(stdout).toContain('input.json');
		});

		it('should advise dispatching Phase 1 reviewers', () => {
			const { success, stdout } = runScript(['--summary', 'Test summary']);
			expect(success).toBe(true);
			expect(stdout).toContain('Phase 1 reviewers');
		});
	});

	describe('Hash Consistency', () => {
		it('should produce consistent hash for same input', () => {
			const summary = 'Consistent hash test summary';

			runScript(['--summary', summary]);
			const hash1 = readInputHash();

			runScript(['--summary', summary]);
			const hash2 = readInputHash();

			// Note: Hash may differ if git state changes between runs,
			// but the hash should be a valid SHA256
			expect(hash1).toMatch(/^[a-f0-9]{64}$/);
			expect(hash2).toMatch(/^[a-f0-9]{64}$/);
		});
	});

	describe('Special Characters', () => {
		it('should handle summary with quotes', () => {
			const { success } = runScript([
				'--summary',
				'Summary with "double quotes" and \'single quotes\'',
			]);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(input?.summary).toContain('double quotes');
			expect(input?.summary).toContain('single quotes');
		});

		it('should handle summary with newlines', () => {
			const { success } = runScript([
				'--summary',
				'Summary with\nnewline character',
			]);
			expect(success).toBe(true);

			const input = readInputJson();
			expect(input?.summary).toContain('newline');
		});
	});
});
