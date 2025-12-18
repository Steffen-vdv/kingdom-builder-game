import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Infrastructure Test: sign.sh
 *
 * Verifies that the signing script correctly:
 * - Accepts --verdict flag (default APPROVED)
 * - Accepts --blockers flag for BLOCKED verdicts
 * - Accepts --questions flag for NEEDS_INPUT verdicts
 * - Includes verdict in payload
 * - Includes blockers/questions in payload when provided
 * - Returns valid JSON with payload, signature, and type
 *
 * NOTE: These tests use a mock crypto-gate binary when the real one is not
 * available (e.g., in CI). The mock produces deterministic signatures,
 * allowing us to test sign.sh's interaction with crypto-gate without
 * depending on the actual binary.
 *
 * Concurrency safety: Uses flock for exclusive access during mock installation.
 *
 * Mock Installation State Machine:
 *
 *   State       | Binary | Marker | PID Live | Action
 *   ------------|--------|--------|----------|---------------------------
 *   ABSENT      | No     | No     | -        | Install mock
 *   REAL        | Yes    | No     | -        | Skip (real binary exists)
 *   ORPHAN      | Mock   | No     | -        | Cleanup orphan, install
 *   OWNED       | Yes    | Yes    | Yes      | Skip (another process owns)
 *   STALE       | Yes    | Yes    | No       | Cleanup stale, install
 *
 * Orphan detection: Compares binary content with mock source to distinguish
 * orphaned mocks (crash between cp and mv) from real binaries.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(
	PROJECT_ROOT,
	'.claude/agents/sub-agent/scripts/sign.sh',
);
const CRYPTO_GATE_PATH = path.join(PROJECT_ROOT, 'bin/crypto-gate');
const MOCK_MARKER_PATH = path.join(PROJECT_ROOT, 'bin/.crypto-gate-is-mock');
const MOCK_LOCK_PATH = path.join(PROJECT_ROOT, 'bin/.crypto-gate-mock.lock');
const MOCK_CRYPTO_GATE_PATH = path.join(
	PROJECT_ROOT,
	'tests/infrastructure/mocks/crypto-gate-mock.sh',
);

/**
 * Executes a callback while holding an exclusive flock.
 * Uses shell flock for POSIX-compliant file locking.
 */
function withFlockSync(lockPath: string, callback: () => string): string {
	// Ensure lock directory exists
	const lockDir = path.dirname(lockPath);
	if (!fs.existsSync(lockDir)) {
		fs.mkdirSync(lockDir, { recursive: true });
	}

	// Use shell flock to serialize access, execute callback script
	const script = callback();
	const result = execSync(
		`flock -x "${lockPath}" -c '${script.replace(/'/g, "'\\''")}'`,
		{ encoding: 'utf-8', stdio: 'pipe' },
	);
	return result;
}

/**
 * Installs mock crypto-gate with flock serialization.
 * Returns 'installed' if we installed, 'skipped' if real binary exists,
 * 'owned' if another process owns it.
 *
 * Handles orphan recovery: if binary exists without marker, compares content
 * with mock source to determine if it's an orphaned mock or a real binary.
 */
function installMockWithLock(): 'installed' | 'skipped' | 'owned' | 'error' {
	const installScript = `
		set -euo pipefail
		MARKER="${MOCK_MARKER_PATH}"
		BINARY="${CRYPTO_GATE_PATH}"
		MOCK_SRC="${MOCK_CRYPTO_GATE_PATH}"

		# State: OWNED or STALE (marker exists)
		if [ -f "$MARKER" ]; then
			OWNER_PID=$(grep -o 'installed-by-pid-[0-9]*' "$MARKER" | grep -o '[0-9]*')
			if [ -n "$OWNER_PID" ] && kill -0 "$OWNER_PID" 2>/dev/null; then
				# OWNED: another live process owns it
				echo "owned"
				exit 0
			fi
			# STALE: marker with dead PID - clean up both
			rm -f "$BINARY" "$MARKER"
		fi

		# State: REAL, ORPHAN, or ABSENT (no marker)
		if [ -x "$BINARY" ]; then
			# Binary exists without marker - check if orphaned mock or real
			if cmp -s "$MOCK_SRC" "$BINARY"; then
				# ORPHAN: content matches mock, crashed between cp and mv
				rm -f "$BINARY"
			else
				# REAL: different content, assume real binary
				echo "skipped"
				exit 0
			fi
		fi

		# State: ABSENT - install mock
		TEMP_MARKER=$(mktemp "$MARKER.XXXXXX")
		echo "installed-by-pid-${process.pid}" > "$TEMP_MARKER"
		cp "$MOCK_SRC" "$BINARY"
		chmod 755 "$BINARY"
		mv "$TEMP_MARKER" "$MARKER"
		echo "installed"
	`;

	try {
		const result = withFlockSync(MOCK_LOCK_PATH, () => installScript);
		return result.trim() as 'installed' | 'skipped' | 'owned';
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		process.stderr.write(`[sign.test.ts] Mock install failed: ${msg}\n`);
		return 'error';
	}
}

/**
 * Cleans up mock with flock serialization.
 * Only cleans if this process owns the mock (marker shows our PID).
 * Also cleans orphaned mocks (binary without marker that matches mock source).
 */
function cleanupMockWithLock(): void {
	const cleanupScript = `
		set -euo pipefail
		MARKER="${MOCK_MARKER_PATH}"
		BINARY="${CRYPTO_GATE_PATH}"
		MOCK_SRC="${MOCK_CRYPTO_GATE_PATH}"

		# Clean up if marker indicates we own it
		if [ -f "$MARKER" ]; then
			OWNER_PID=$(grep -o 'installed-by-pid-[0-9]*' "$MARKER" | grep -o '[0-9]*')
			if [ "$OWNER_PID" = "${process.pid}" ]; then
				rm -f "$BINARY" "$MARKER"
				exit 0
			fi
		fi

		# Also clean orphaned mocks (binary without marker matching our mock)
		if [ -x "$BINARY" ] && [ ! -f "$MARKER" ]; then
			if cmp -s "$MOCK_SRC" "$BINARY"; then
				rm -f "$BINARY"
			fi
		fi
	`;

	try {
		withFlockSync(MOCK_LOCK_PATH, () => cleanupScript);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		process.stderr.write(`[sign.test.ts] Mock cleanup failed: ${msg}\n`);
	}
}

interface SignResult {
	payload: string;
	signature: string;
	type: string;
}

interface RunResult {
	success: boolean;
	stdout: string;
	stderr: string;
}

function runScript(args: string[]): RunResult {
	const quotedArgs = args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ');
	const command = `bash "${SCRIPT_PATH}" ${quotedArgs}`;

	try {
		const stdout = execSync(command, {
			encoding: 'utf-8',
			stdio: 'pipe',
			cwd: PROJECT_ROOT,
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

// Track if THIS process installed the mock (for cleanup)
let weInstalledMock = false;

describe('Infrastructure: sign.sh', () => {
	beforeAll(() => {
		// Install mock with flock serialization to prevent races
		const result = installMockWithLock();
		if (result === 'error') {
			throw new Error('Failed to install mock crypto-gate - check stderr');
		}
		weInstalledMock = result === 'installed';
	});

	afterAll(() => {
		// Clean up with flock serialization if we installed
		if (weInstalledMock) {
			cleanupMockWithLock();
			weInstalledMock = false;
		}
	});

	describe('Basic Usage', () => {
		it('should require summary and signature type arguments', () => {
			const { success, stderr } = runScript([]);
			expect(success).toBe(false);
			expect(stderr).toContain('Usage:');
		});

		it('should return valid JSON with payload, signature, and type', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			expect(result).toHaveProperty('payload');
			expect(result).toHaveProperty('signature');
			expect(result).toHaveProperty('type');
			expect(result.type).toBe('QA_TEST_TYPE');
		});

		it('should include summary in payload', () => {
			const { success, stdout } = runScript([
				'My test summary',
				'QA_TEST_TYPE',
			]);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload.summary).toBe('My test summary');
		});
	});

	describe('--verdict Flag', () => {
		it('should default to APPROVED verdict', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload.verdict).toBe('APPROVED');
		});

		it('should accept --verdict APPROVED', () => {
			const { success, stdout } = runScript([
				'Test summary',
				'QA_TEST_TYPE',
				'--verdict',
				'APPROVED',
			]);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload.verdict).toBe('APPROVED');
		});

		it('should accept --verdict BLOCKED', () => {
			const { success, stdout } = runScript([
				'Test summary',
				'QA_TEST_TYPE',
				'--verdict',
				'BLOCKED',
				'--blockers',
				'["issue1"]',
			]);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload.verdict).toBe('BLOCKED');
		});

		it('should accept --verdict NEEDS_INPUT', () => {
			const { success, stdout } = runScript([
				'Test summary',
				'QA_TEST_TYPE',
				'--verdict',
				'NEEDS_INPUT',
				'--questions',
				'["question1"]',
			]);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload.verdict).toBe('NEEDS_INPUT');
		});
	});

	describe('--blockers Flag', () => {
		it('should include blockers in payload when provided', () => {
			const { success, stdout } = runScript([
				'Test summary',
				'QA_TEST_TYPE',
				'--verdict',
				'BLOCKED',
				'--blockers',
				'["issue 1","issue 2"]',
			]);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload.blockers).toEqual(['issue 1', 'issue 2']);
		});

		it('should not include blockers key when not provided', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload).not.toHaveProperty('blockers');
		});
	});

	describe('--questions Flag', () => {
		it('should include questions in payload when provided', () => {
			const { success, stdout } = runScript([
				'Test summary',
				'QA_TEST_TYPE',
				'--verdict',
				'NEEDS_INPUT',
				'--questions',
				'["What is X?","How does Y work?"]',
			]);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload.questions).toEqual(['What is X?', 'How does Y work?']);
		});

		it('should not include questions key when not provided', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload).not.toHaveProperty('questions');
		});
	});

	describe('Payload Structure', () => {
		it('should include commits array in payload', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload).toHaveProperty('commits');
			expect(Array.isArray(payload.commits)).toBe(true);
		});

		it('should include timestamp in payload', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload).toHaveProperty('timestamp');
			// Should be ISO 8601 format
			expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('should include diffHash in payload', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			const payload = JSON.parse(result.payload);
			expect(payload).toHaveProperty('diffHash');
			expect(typeof payload.diffHash).toBe('string');
		});
	});

	describe('Signature', () => {
		it('should return a non-empty signature', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			expect(result.signature).toBeTruthy();
			expect(result.signature.length).toBeGreaterThan(0);
		});

		it('should return hex signature', () => {
			const { success, stdout } = runScript(['Test summary', 'QA_TEST_TYPE']);
			expect(success).toBe(true);

			const result: SignResult = JSON.parse(stdout);
			// Signature should be hex string
			expect(result.signature).toMatch(/^[0-9a-f]+$/);
		});
	});
});
