import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: log.sh
 *
 * Verifies that the centralized logging helper:
 * - Writes log entries with correct format
 * - Uses flock for atomic writes
 * - Handles concurrent writes without corruption
 * - Creates log directory if missing
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(
	PROJECT_ROOT,
	'.claude/agents/shared/scripts/log.sh',
);
// Use PID-namespaced directory to isolate tests from production
const TEST_LOG_DIR = `/tmp/claude/test-${process.pid}/hooks`;
const TEST_LOG_FILE = `${TEST_LOG_DIR}/central.log`;
const TEST_LOG_LOCK = `${TEST_LOG_DIR}/.central.log.lock`;

// Helper to run bash with log.sh sourced
function runWithLog(script: string): string {
	// Override LOG_FILE and LOG_LOCK in the sourced script
	const fullScript = `
		export LOG_FILE="${TEST_LOG_FILE}"
		export LOG_LOCK="${TEST_LOG_LOCK}"
		source "${SCRIPT_PATH}"
		# Override the variables after sourcing
		LOG_FILE="${TEST_LOG_FILE}"
		LOG_LOCK="${TEST_LOG_LOCK}"
		${script}
	`;

	return execSync(`bash -c '${fullScript.replace(/'/g, "'\\''")}'`, {
		encoding: 'utf-8',
		cwd: PROJECT_ROOT,
	}).trim();
}

// Helper to read the test log file
function readLog(): string {
	if (fs.existsSync(TEST_LOG_FILE)) {
		return fs.readFileSync(TEST_LOG_FILE, 'utf-8');
	}
	return '';
}

// Helper to clear the test log
function clearLog(): void {
	if (fs.existsSync(TEST_LOG_FILE)) {
		fs.unlinkSync(TEST_LOG_FILE);
	}
	if (fs.existsSync(TEST_LOG_LOCK)) {
		fs.unlinkSync(TEST_LOG_LOCK);
	}
}

describe('Infrastructure: log.sh', () => {
	beforeEach(() => {
		// Create test directory
		fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
		clearLog();
	});

	afterEach(() => {
		clearLog();
		// Clean up test directory
		try {
			fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('log_hook function', () => {
		it('should write formatted log entry with tag and message', () => {
			runWithLog('log_hook "test-tag" "Test message"');
			const log = readLog();

			expect(log).toContain('[test-tag]');
			expect(log).toContain('Test message');
			// Should contain ISO timestamp
			expect(log).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});

		it('should handle special characters in message', () => {
			// Use characters that don't get shell-expanded
			runWithLog(
				'log_hook "tag" "Message with spaces, colons: and dashes-here!"',
			);
			const log = readLog();

			expect(log).toContain('Message with spaces, colons: and dashes-here!');
		});

		it('should append to existing log', () => {
			runWithLog('log_hook "tag1" "First message"');
			runWithLog('log_hook "tag2" "Second message"');
			const log = readLog();

			expect(log).toContain('First message');
			expect(log).toContain('Second message');
			// Should be on separate lines
			const lines = log.trim().split('\n');
			expect(lines.length).toBe(2);
		});
	});

	describe('log_session function', () => {
		it('should write session boundary with === markers', () => {
			runWithLog('log_session "start" "SessionStart"');
			const log = readLog();

			// Format: ===    <timestamp>    <event>     <tag>   ===
			expect(log).toContain('SessionStart');
			expect(log).toMatch(/^===.*===$/m);
		});

		it('should include status when provided', () => {
			runWithLog('log_session "start" "SessionStart" "completed"');
			const log = readLog();

			// Format: ===    <timestamp>    <event> <status>     <tag>   ===
			expect(log).toContain('SessionStart completed');
		});

		it('should work without status', () => {
			runWithLog('log_session "start" "SessionStart"');
			const log = readLog();

			// Format: ===    <timestamp>    <event>     <tag>   ===
			// Should contain tag and event with timestamp in between
			expect(log).toMatch(/===.*\d{4}-\d{2}-\d{2}T.*SessionStart.*start.*===/);
		});
	});

	describe('Concurrency handling', () => {
		it('should handle concurrent writes without corruption', async () => {
			const NUM_WRITERS = 10;
			const WRITES_PER_WRITER = 20;

			// Create a script that writes multiple log entries
			const writerScript = `
				export LOG_FILE="${TEST_LOG_FILE}"
				export LOG_LOCK="${TEST_LOG_LOCK}"
				source "${SCRIPT_PATH}"
				LOG_FILE="${TEST_LOG_FILE}"
				LOG_LOCK="${TEST_LOG_LOCK}"
				WRITER_ID=$1
				for i in $(seq 1 ${WRITES_PER_WRITER}); do
					log_hook "writer-$WRITER_ID" "Message $i from writer $WRITER_ID"
				done
			`;

			// Spawn multiple writers in parallel
			const writers: Promise<void>[] = [];
			for (let i = 0; i < NUM_WRITERS; i++) {
				writers.push(
					new Promise((resolve, reject) => {
						const child = spawn(
							'bash',
							['-c', writerScript.replace(/'/g, "'\\''"), '--', String(i)],
							{
								cwd: PROJECT_ROOT,
								stdio: 'pipe',
							},
						);
						child.on('close', (code) => {
							if (code === 0) {
								resolve();
							} else {
								reject(new Error(`Writer ${i} failed with code ${code}`));
							}
						});
						child.on('error', reject);
					}),
				);
			}

			// Wait for all writers to complete
			await Promise.all(writers);

			// Read and verify the log
			const log = readLog();
			const lines = log.trim().split('\n');

			// Should have exactly the expected number of lines
			expect(lines.length).toBe(NUM_WRITERS * WRITES_PER_WRITER);

			// Each line should be complete (no interleaved writes)
			for (const line of lines) {
				// Each line should match the expected format
				expect(line).toMatch(
					/^\[writer-\d+\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2} Message \d+ from writer \d+$/,
				);
			}

			// Verify all writers contributed their messages
			for (let writerIdx = 0; writerIdx < NUM_WRITERS; writerIdx++) {
				for (let msgIdx = 1; msgIdx <= WRITES_PER_WRITER; msgIdx++) {
					expect(log).toContain(`Message ${msgIdx} from writer ${writerIdx}`);
				}
			}
		});

		it('should create log directory if missing', () => {
			// Remove the test directory
			fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });

			// The log.sh should create it
			runWithLog('log_hook "test" "Creating directory"');

			// Directory should now exist
			expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
			expect(fs.existsSync(TEST_LOG_FILE)).toBe(true);
		});
	});

	describe('Integration with hook scripts', () => {
		it('should be sourceable from any directory', () => {
			// Run from a different directory
			const result = execSync(
				`cd /tmp && bash -c 'source "${SCRIPT_PATH}" && echo "sourced ok"'`,
				{ encoding: 'utf-8' },
			).trim();

			expect(result).toBe('sourced ok');
		});
	});
});
