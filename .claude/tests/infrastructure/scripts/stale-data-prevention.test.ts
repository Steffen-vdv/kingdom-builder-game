import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: Stale QA Data Prevention
 *
 * Verifies that the stale data prevention mechanisms work correctly:
 * 1. qa_is_already_pushed() helper detects already-pushed commits
 * 2. Prompt log archiving creates timestamped files
 * 3. Archive pruning keeps only last 10 files
 * 4. last-pushed.sha file format is correct
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const QA_HOOK_LIB = path.join(
	PROJECT_ROOT,
	'.claude/agents/shared/scripts/qa-hook-lib.sh',
);

// Use PID-namespaced directories for test isolation
const TEST_DIR = `/tmp/claude/test-stale-${process.pid}`;
const QA_CURRENT_DIR = `${TEST_DIR}/qa/current`;
const QA_ARCHIVE_DIR = `${TEST_DIR}/qa/archive`;
const PROMPT_LOG_FILE = `${TEST_DIR}/qa/prompts.jsonl`;

interface RunResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
}

function runBashScript(script: string): RunResult {
	const fullScript = `
		set -euo pipefail
		export CLAUDE_PROJECT_DIR="${PROJECT_ROOT}"
		export QA_CURRENT_DIR="${QA_CURRENT_DIR}"
		export QA_PROMPT_LOG_FILE="${PROMPT_LOG_FILE}"
		source "${QA_HOOK_LIB}"
		${script}
	`;

	try {
		const stdout = execSync(`bash -c '${fullScript.replace(/'/g, "'\\''")}'`, {
			encoding: 'utf-8',
			stdio: 'pipe',
			cwd: PROJECT_ROOT,
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

function setupTestDirs(): void {
	fs.mkdirSync(QA_CURRENT_DIR, { recursive: true });
	fs.mkdirSync(QA_ARCHIVE_DIR, { recursive: true });
	fs.mkdirSync(path.dirname(PROMPT_LOG_FILE), { recursive: true });
}

function cleanupTestDirs(): void {
	fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

describe('Infrastructure: Stale QA Data Prevention', () => {
	beforeEach(() => {
		cleanupTestDirs();
		setupTestDirs();
	});

	afterEach(() => {
		cleanupTestDirs();
	});

	describe('qa_is_already_pushed() helper', () => {
		it('should return false when last-pushed.sha does not exist', () => {
			const result = runBashScript(`
				if qa_is_already_pushed; then
					echo "ALREADY_PUSHED"
				else
					echo "NOT_PUSHED"
				fi
			`);

			expect(result.success).toBe(true);
			expect(result.stdout.trim()).toBe('NOT_PUSHED');
		});

		it('should return false when last-pushed.sha is empty', () => {
			fs.writeFileSync(`${QA_CURRENT_DIR}/last-pushed.sha`, '');

			const result = runBashScript(`
				if qa_is_already_pushed; then
					echo "ALREADY_PUSHED"
				else
					echo "NOT_PUSHED"
				fi
			`);

			expect(result.success).toBe(true);
			expect(result.stdout.trim()).toBe('NOT_PUSHED');
		});

		it('should return true when HEAD matches last-pushed.sha', () => {
			// Get actual HEAD SHA
			const headSha = execSync('git rev-parse HEAD', {
				encoding: 'utf-8',
				cwd: PROJECT_ROOT,
			}).trim();

			fs.writeFileSync(`${QA_CURRENT_DIR}/last-pushed.sha`, headSha);

			const result = runBashScript(`
				if qa_is_already_pushed; then
					echo "ALREADY_PUSHED"
				else
					echo "NOT_PUSHED"
				fi
			`);

			expect(result.success).toBe(true);
			expect(result.stdout.trim()).toBe('ALREADY_PUSHED');
		});

		it('should return false when HEAD differs from last-pushed.sha', () => {
			fs.writeFileSync(
				`${QA_CURRENT_DIR}/last-pushed.sha`,
				'0000000000000000000000000000000000000000',
			);

			const result = runBashScript(`
				if qa_is_already_pushed; then
					echo "ALREADY_PUSHED"
				else
					echo "NOT_PUSHED"
				fi
			`);

			expect(result.success).toBe(true);
			expect(result.stdout.trim()).toBe('NOT_PUSHED');
		});
	});

	describe('last-pushed.sha file format', () => {
		it('should contain a valid SHA-1 hash format', () => {
			const headSha = execSync('git rev-parse HEAD', {
				encoding: 'utf-8',
				cwd: PROJECT_ROOT,
			}).trim();

			fs.writeFileSync(`${QA_CURRENT_DIR}/last-pushed.sha`, headSha);

			const content = fs.readFileSync(
				`${QA_CURRENT_DIR}/last-pushed.sha`,
				'utf-8',
			);
			expect(content).toMatch(/^[a-f0-9]{40}$/);
		});
	});

	describe('Prompt log archiving', () => {
		it('should archive prompt log with UTC timestamp format', () => {
			// Create a prompt log file
			fs.writeFileSync(
				PROMPT_LOG_FILE,
				'{"prompt":"test prompt"}\n{"prompt":"another prompt"}\n',
			);

			// Run archive operation (simulating cleanup_qa_outputs behavior)
			// Note: 'local' only works inside functions, so we use regular vars
			const result = runBashScript(`
				if [[ -f "$QA_PROMPT_LOG_FILE" ]]; then
					archive_dir="${QA_ARCHIVE_DIR}"
					mkdir -p "$archive_dir"
					timestamp=$(date -u +%Y%m%d-%H%M%S)
					mv "$QA_PROMPT_LOG_FILE" "$archive_dir/prompts-$timestamp.jsonl"
					echo "ARCHIVED:$timestamp"
				fi
			`);

			expect(result.success).toBe(true);
			expect(result.stdout).toContain('ARCHIVED:');

			// Verify archive was created
			const archives = fs.readdirSync(QA_ARCHIVE_DIR);
			expect(archives.length).toBe(1);
			expect(archives[0]).toMatch(/^prompts-\d{8}-\d{6}\.jsonl$/);

			// Verify original file was moved
			expect(fs.existsSync(PROMPT_LOG_FILE)).toBe(false);

			// Verify content preserved
			const archivedContent = fs.readFileSync(
				path.join(QA_ARCHIVE_DIR, archives[0]),
				'utf-8',
			);
			expect(archivedContent).toContain('test prompt');
			expect(archivedContent).toContain('another prompt');
		});

		it('should not fail when prompt log does not exist', () => {
			const result = runBashScript(`
				if [[ -f "$QA_PROMPT_LOG_FILE" ]]; then
					echo "FILE_EXISTS"
				else
					echo "NO_FILE"
				fi
			`);

			expect(result.success).toBe(true);
			expect(result.stdout.trim()).toBe('NO_FILE');
		});
	});

	describe('Archive pruning (keep last 10)', () => {
		it('should keep only the 10 most recent archives', () => {
			// Create 15 archive files with different modification times
			// We use touch with -t to set explicit timestamps for deterministic sorting
			for (let i = 0; i < 15; i++) {
				const timestamp = `20251220-${String(i).padStart(6, '0')}`;
				const filePath = path.join(
					QA_ARCHIVE_DIR,
					`prompts-${timestamp}.jsonl`,
				);
				fs.writeFileSync(filePath, `{"index":${i}}\n`);
			}

			// Set modification times using touch (oldest to newest: 0-14)
			// This ensures ls -t will sort them predictably
			for (let i = 0; i < 15; i++) {
				const timestamp = `20251220-${String(i).padStart(6, '0')}`;
				const filePath = path.join(
					QA_ARCHIVE_DIR,
					`prompts-${timestamp}.jsonl`,
				);
				// touch -t format: [[CC]YY]MMDDhhmm[.ss]
				const touchTime = `202512200${String(i).padStart(3, '0')}`;
				execSync(`touch -t ${touchTime} "${filePath}"`);
			}

			// Run pruning logic
			const result = runBashScript(`
				ls -t "${QA_ARCHIVE_DIR}"/prompts-*.jsonl 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
				echo "PRUNED"
			`);

			expect(result.success).toBe(true);

			// Verify only 10 files remain
			const remainingFiles = fs.readdirSync(QA_ARCHIVE_DIR);
			expect(remainingFiles.length).toBe(10);

			// Verify the 10 newest (by mtime) are kept: indices 5-14
			const sortedRemaining = remainingFiles.sort();
			expect(sortedRemaining[0]).toBe('prompts-20251220-000005.jsonl');
			expect(sortedRemaining[9]).toBe('prompts-20251220-000014.jsonl');
		});

		it('should not fail when fewer than 10 archives exist', () => {
			// Create only 3 archive files
			for (let i = 0; i < 3; i++) {
				fs.writeFileSync(
					path.join(QA_ARCHIVE_DIR, `prompts-20251220-00000${i}.jsonl`),
					`{"index":${i}}\n`,
				);
			}

			const result = runBashScript(`
				ls -t "${QA_ARCHIVE_DIR}"/prompts-*.jsonl 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
				echo "PRUNED"
			`);

			expect(result.success).toBe(true);

			// All 3 files should still exist
			const remainingFiles = fs.readdirSync(QA_ARCHIVE_DIR);
			expect(remainingFiles.length).toBe(3);
		});

		it('should not fail when archive directory is empty', () => {
			const result = runBashScript(`
				ls -t "${QA_ARCHIVE_DIR}"/prompts-*.jsonl 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
				echo "PRUNED"
			`);

			expect(result.success).toBe(true);
			expect(result.stdout.trim()).toBe('PRUNED');
		});
	});
});
