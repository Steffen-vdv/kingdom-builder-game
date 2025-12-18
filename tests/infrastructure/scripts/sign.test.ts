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
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(
	PROJECT_ROOT,
	'.claude/agents/sub-agent/scripts/sign.sh',
);
const CRYPTO_GATE_PATH = path.join(PROJECT_ROOT, 'bin/crypto-gate');
const MOCK_MARKER_PATH = path.join(PROJECT_ROOT, 'bin/.crypto-gate-is-mock');
const MOCK_CRYPTO_GATE_PATH = path.join(
	PROJECT_ROOT,
	'tests/infrastructure/mocks/crypto-gate-mock.sh',
);

/**
 * Cleans up any stale mock from crashed test runs.
 * If marker exists, the binary is a mock and should be removed.
 */
function cleanupStaleMock(): void {
	if (fs.existsSync(MOCK_MARKER_PATH)) {
		if (fs.existsSync(CRYPTO_GATE_PATH)) {
			fs.unlinkSync(CRYPTO_GATE_PATH);
		}
		fs.unlinkSync(MOCK_MARKER_PATH);
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

describe('Infrastructure: sign.sh', () => {
	beforeAll(() => {
		// Clean up any stale mock from previous crashed runs
		cleanupStaleMock();

		// If real crypto-gate doesn't exist, install the mock
		if (!fs.existsSync(CRYPTO_GATE_PATH)) {
			// Ensure bin directory exists
			const binDir = path.dirname(CRYPTO_GATE_PATH);
			if (!fs.existsSync(binDir)) {
				fs.mkdirSync(binDir, { recursive: true });
			}
			// Copy mock to bin/crypto-gate
			fs.copyFileSync(MOCK_CRYPTO_GATE_PATH, CRYPTO_GATE_PATH);
			fs.chmodSync(CRYPTO_GATE_PATH, 0o755);
			// Create marker file to indicate this is a mock (for crash recovery)
			fs.writeFileSync(MOCK_MARKER_PATH, `installed-by-pid-${process.pid}\n`);
		}
	});

	afterAll(() => {
		// Clean up mock if marker exists (we installed it)
		if (fs.existsSync(MOCK_MARKER_PATH)) {
			if (fs.existsSync(CRYPTO_GATE_PATH)) {
				fs.unlinkSync(CRYPTO_GATE_PATH);
			}
			fs.unlinkSync(MOCK_MARKER_PATH);
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
