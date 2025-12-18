import {
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
	beforeAll,
	afterAll,
} from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Infrastructure Test: write-output.sh
 *
 * Verifies that the write-output script correctly:
 * - Constructs valid JSON from field arguments
 * - Maps --type to signature_type in output
 * - Validates required fields based on verdict
 * - Requires signature fields for ALL verdicts (enables delta review)
 * - Validates conditional fields
 *   (blockers for BLOCKED, questions for NEEDS_INPUT)
 * - Rejects invalid argument combinations
 * - Verifies signatures cryptographically before writing
 *
 * NOTE: These tests use a mock crypto-gate binary. The mock produces
 * deterministic signatures using sha256(payload+type).
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(
	PROJECT_ROOT,
	'.claude/agents/sub-agent/scripts/write-output.sh',
);
// Use PID-namespaced directory to isolate tests
const OUTPUT_DIR = `/tmp/claude/test-${process.pid}/output`;

// Crypto-gate mock paths
const CRYPTO_GATE_PATH = path.join(PROJECT_ROOT, 'bin/crypto-gate');
const CRYPTO_GATE_BACKUP_PATH = path.join(
	PROJECT_ROOT,
	'bin/.crypto-gate-backup',
);
const MOCK_SOURCE_PATH = path.join(
	PROJECT_ROOT,
	'tests/infrastructure/mocks/crypto-gate-mock.sh',
);
const MOCK_MARKER_PATH = path.join(PROJECT_ROOT, 'bin/.crypto-gate-is-mock');
const MOCK_LOCK_PATH = path.join(PROJECT_ROOT, 'bin/.crypto-gate-mock.lock');

// Track if THIS process installed the mock (for cleanup)
let mockInstalledByThisProcess = false;

/**
 * Generate a valid mock signature for a payload+type pair.
 * This matches the mock crypto-gate's signing algorithm.
 */
function generateMockSignature(payload: string, sigType: string): string {
	return crypto
		.createHash('sha256')
		.update(payload + sigType)
		.digest('hex');
}

/**
 * Installs mock crypto-gate, backing up any existing binary.
 * This ensures tests always use the mock for signature verification.
 */
function installMockCryptoGate(): 'installed' | 'skipped' | 'orphan_recovered' {
	// Use flock for exclusive access
	const lockResult = execSync(
		`
		exec 200>"${MOCK_LOCK_PATH}"
		flock -x 200

		# Check if mock is already installed
		if [ -f "${MOCK_MARKER_PATH}" ]; then
			echo "ALREADY_MOCK"
			exit 0
		fi

		# Backup existing binary/symlink if present
		if [ -e "${CRYPTO_GATE_PATH}" ] || [ -L "${CRYPTO_GATE_PATH}" ]; then
			# Check if orphaned mock (content matches, no marker)
			if [ -f "${CRYPTO_GATE_PATH}" ] && diff -q "${CRYPTO_GATE_PATH}" "${MOCK_SOURCE_PATH}" >/dev/null 2>&1; then
				# ORPHAN: content matches mock, crashed between cp and creating marker
				echo "${process.pid}" > "${MOCK_MARKER_PATH}"
				echo "ORPHAN_RECOVERED"
				exit 0
			fi
			# Backup real binary (handle both regular files and symlinks)
			if [ ! -e "${CRYPTO_GATE_BACKUP_PATH}" ]; then
				mv "${CRYPTO_GATE_PATH}" "${CRYPTO_GATE_BACKUP_PATH}"
			else
				rm -f "${CRYPTO_GATE_PATH}"
			fi
		fi

		# Install mock
		mkdir -p "$(dirname "${CRYPTO_GATE_PATH}")"
		cp "${MOCK_SOURCE_PATH}" "${CRYPTO_GATE_PATH}"
		chmod +x "${CRYPTO_GATE_PATH}"
		echo "${process.pid}" > "${MOCK_MARKER_PATH}"
		echo "INSTALLED"
	`,
		{ encoding: 'utf-8', shell: '/bin/bash' },
	).trim();

	if (lockResult === 'INSTALLED') {
		return 'installed';
	}
	if (lockResult === 'ORPHAN_RECOVERED') {
		return 'orphan_recovered';
	}
	return 'skipped';
}

/**
 * Cleans up mock if this process installed it, restoring any backup.
 */
function cleanupMockCryptoGate(): void {
	if (!mockInstalledByThisProcess) {
		return;
	}

	try {
		execSync(
			`
			exec 200>"${MOCK_LOCK_PATH}"
			flock -x 200

			if [ -f "${MOCK_MARKER_PATH}" ]; then
				OWNER=$(cat "${MOCK_MARKER_PATH}")
				if [ "$OWNER" = "${process.pid}" ]; then
					rm -f "${CRYPTO_GATE_PATH}" "${MOCK_MARKER_PATH}"
					# Restore backup if it exists
					if [ -e "${CRYPTO_GATE_BACKUP_PATH}" ]; then
						mv "${CRYPTO_GATE_BACKUP_PATH}" "${CRYPTO_GATE_PATH}"
					fi
				fi
			fi
		`,
			{ encoding: 'utf-8', shell: '/bin/bash' },
		);
	} catch {
		// Ignore cleanup errors
	}
}

interface RunResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
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

function _readOutputFile(agent: string): object | null {
	const filePath = path.join(OUTPUT_DIR, `${agent}.json`);
	if (!fs.existsSync(filePath)) {
		return null;
	}
	return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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

// Patch the script's output directory for tests
function patchOutputDir(): void {
	// The script uses a hardcoded path, so we need to ensure it writes there
	// For testing, we'll verify the actual output location
	fs.mkdirSync('/tmp/claude/sub-agents/output', { recursive: true });
}

describe('Infrastructure: write-output.sh', () => {
	beforeAll(() => {
		// Install mock crypto-gate for signature verification tests
		const result = installMockCryptoGate();
		mockInstalledByThisProcess =
			result === 'installed' || result === 'orphan_recovered';
	});

	afterAll(() => {
		cleanupMockCryptoGate();
	});

	beforeEach(() => {
		cleanOutputDirectory();
		patchOutputDir();
	});

	afterEach(() => {
		// Clean up both test and production paths
		cleanOutputDirectory();
		// Clean up all possible output files from tests
		const agentFiles = [
			'review-ci-tests-required.json',
			'review-claims-auditor.json',
		];
		for (const file of agentFiles) {
			const prodFile = `/tmp/claude/sub-agents/output/${file}`;
			if (fs.existsSync(prodFile)) {
				fs.unlinkSync(prodFile);
			}
		}
	});

	describe('Help and Usage', () => {
		it('should show usage when no arguments provided', () => {
			const { success, stderr } = runScript([]);
			expect(success).toBe(false);
			expect(stderr).toContain('write-output.sh');
			expect(stderr).toContain('Usage:');
			expect(stderr).toContain('--verdict');
		});
	});

	describe('APPROVED Verdict', () => {
		it('should create valid JSON with all signature fields', () => {
			// Use valid agent/signature type combination with valid mock signature
			const payload = '{"commits":["abc123"]}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signature = generateMockSignature(payload, sigType);

			const { success, stdout } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'All checks passed',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
				'--details',
				'{"risk":"LOW"}',
			]);

			expect(success).toBe(true);
			expect(stdout).toContain('Output written to');

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-ci-tests-required.json',
					'utf-8',
				),
			);
			expect(output.agent).toBe('review-ci-tests-required');
			expect(output.verdict).toBe('APPROVED');
			expect(output.summary).toBe('All checks passed');
			expect(output.signature_type).toBe('QA_CI_REQUIRED_TESTS');
			expect(output.payload).toBe(payload);
			expect(output.signature).toBe(signature);
			expect(output.blockers).toBeNull();
			expect(output.questions).toBeNull();
			expect(output.details).toEqual({ risk: 'LOW' });
		});

		it('should map --type to signature_type in output', () => {
			// Use review-claims-auditor with its matching signature type
			const payload = '{}';
			const sigType = 'QA_CLAIMS_AUDITOR';
			const signature = generateMockSignature(payload, sigType);

			const { success } = runScript([
				'review-claims-auditor',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
			]);

			expect(success).toBe(true);

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-claims-auditor.json',
					'utf-8',
				),
			);
			// Verify --type becomes signature_type (not "type")
			expect(output).toHaveProperty('signature_type');
			expect(output).not.toHaveProperty('type');
			expect(output.signature_type).toBe('QA_CLAIMS_AUDITOR');
		});

		it('should fail when --type is missing', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--type (signature type) is required');
		});

		it('should fail when --payload is missing', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--payload (signed payload) is required');
		});

		it('should fail when --signature is missing', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--signature (hex signature) is required');
		});

		it('should fail when --blockers is provided with APPROVED', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
				'--blockers',
				'["should not be here"]',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('APPROVED verdict must not have --blockers');
		});

		it('should fail when agent/signature type mismatch', () => {
			// Mismatch: agent needs QA_CI_REQUIRED_TESTS, not QA_CLAIMS_AUDITOR
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				'QA_CLAIMS_AUDITOR',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain(
				"must use signature type 'QA_CI_REQUIRED_TESTS'",
			);
		});

		it('should fail when agent identifier is invalid', () => {
			const { success, stderr } = runScript([
				'invalid-agent',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('INVALID AGENT IDENTIFIER');
		});
	});

	describe('BLOCKED Verdict', () => {
		it('should create valid JSON with blockers array and signature', () => {
			const payload = '{"verdict":"BLOCKED","blockers":["Issue 1","Issue 2"]}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signature = generateMockSignature(payload, sigType);

			const { success } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'BLOCKED',
				'--summary',
				'Found issues',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
				'--blockers',
				'["Issue 1","Issue 2"]',
				'--details',
				'{"severity":"HIGH"}',
			]);

			expect(success).toBe(true);

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-ci-tests-required.json',
					'utf-8',
				),
			);
			expect(output.agent).toBe('review-ci-tests-required');
			expect(output.verdict).toBe('BLOCKED');
			expect(output.summary).toBe('Found issues');
			expect(output.signature_type).toBe('QA_CI_REQUIRED_TESTS');
			expect(output.payload).toBe(payload);
			expect(output.signature).toBe(signature);
			expect(output.blockers).toEqual(['Issue 1', 'Issue 2']);
			expect(output.questions).toBeNull();
		});

		it('should fail when --blockers is missing', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'BLOCKED',
				'--summary',
				'Found issues',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('BLOCKED verdict requires --blockers');
		});

		it('should fail when signature fields are missing with BLOCKED', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'BLOCKED',
				'--summary',
				'Found issues',
				'--blockers',
				'["Issue"]',
			]);

			expect(success).toBe(false);
			// All verdicts require signature fields for delta review
			expect(stderr).toContain('--type (signature type) is required');
		});
	});

	describe('NEEDS_INPUT Verdict', () => {
		it('should create valid JSON with questions array and signature', () => {
			const payload = '{"verdict":"NEEDS_INPUT","questions":["Q1","Q2"]}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signature = generateMockSignature(payload, sigType);

			const { success } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'NEEDS_INPUT',
				'--summary',
				'Need clarification',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
				'--questions',
				'["What is the expected behavior?","Should this affect X?"]',
			]);

			expect(success).toBe(true);

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-ci-tests-required.json',
					'utf-8',
				),
			);
			expect(output.verdict).toBe('NEEDS_INPUT');
			expect(output.signature_type).toBe('QA_CI_REQUIRED_TESTS');
			expect(output.payload).toBe(payload);
			expect(output.signature).toBe(signature);
			expect(output.questions).toEqual([
				'What is the expected behavior?',
				'Should this affect X?',
			]);
			expect(output.blockers).toBeNull();
		});

		it('should fail when --questions is missing', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'NEEDS_INPUT',
				'--summary',
				'Need clarification',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('NEEDS_INPUT verdict requires --questions');
		});
	});

	describe('ERROR Verdict', () => {
		it('should allow ERROR verdict with signature fields', () => {
			const payload = '{"verdict":"ERROR"}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signature = generateMockSignature(payload, sigType);

			const { success } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
				'--summary',
				'Script crashed unexpectedly',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
			]);

			expect(success).toBe(true);

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-ci-tests-required.json',
					'utf-8',
				),
			);
			expect(output.verdict).toBe('ERROR');
			expect(output.summary).toBe('Script crashed unexpectedly');
			expect(output.signature_type).toBe('QA_CI_REQUIRED_TESTS');
			expect(output.payload).toBe(payload);
			expect(output.signature).toBe(signature);
		});

		it('should fail when signature fields are missing with ERROR', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
				'--summary',
				'Script crashed unexpectedly',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--type (signature type) is required');
		});
	});

	describe('Validation', () => {
		it('should fail when verdict is invalid', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVE',
				'--summary',
				'Test',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain(
				'--verdict must be APPROVED, BLOCKED, NEEDS_INPUT, or ERROR',
			);
		});

		it('should fail when verdict is missing', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--summary',
				'Test',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--verdict is required');
		});

		it('should fail when summary is missing', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--summary is required');
		});

		it('should fail when --blockers is not a JSON array', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'BLOCKED',
				'--summary',
				'Test',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
				'--blockers',
				'not an array',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--blockers must be a valid JSON array');
		});

		it('should fail when --details is not a JSON object', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
				'--summary',
				'Test',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
				'--details',
				'["not","an","object"]',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--details must be a valid JSON object');
		});

		it('should fail on unknown arguments', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
				'--summary',
				'Test',
				'--type',
				'QA_CI_REQUIRED_TESTS',
				'--payload',
				'{}',
				'--signature',
				'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
				'--unknown',
				'value',
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('Unknown argument');
		});
	});

	describe('JSON Output Structure', () => {
		it('should always include all schema fields', () => {
			const payload = '{}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signature = generateMockSignature(payload, sigType);

			const { success } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
				'--summary',
				'Test',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
			]);

			expect(success).toBe(true);

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-ci-tests-required.json',
					'utf-8',
				),
			);

			// All fields should be present (even if null)
			expect(output).toHaveProperty('agent');
			expect(output).toHaveProperty('verdict');
			expect(output).toHaveProperty('summary');
			expect(output).toHaveProperty('signature_type');
			expect(output).toHaveProperty('payload');
			expect(output).toHaveProperty('signature');
			expect(output).toHaveProperty('blockers');
			expect(output).toHaveProperty('questions');
			expect(output).toHaveProperty('details');
		});

		it('should use empty object as default for details', () => {
			const payload = '{}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signature = generateMockSignature(payload, sigType);

			const { success } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
				'--summary',
				'Test',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
			]);

			expect(success).toBe(true);

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-ci-tests-required.json',
					'utf-8',
				),
			);
			expect(output.details).toEqual({});
		});

		it('should properly escape special characters in summary', () => {
			const payload = '{}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signature = generateMockSignature(payload, sigType);

			const { success } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'ERROR',
				'--summary',
				'Test with "quotes" and \\backslash',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				signature,
			]);

			expect(success).toBe(true);

			const output = JSON.parse(
				fs.readFileSync(
					'/tmp/claude/sub-agents/output/review-ci-tests-required.json',
					'utf-8',
				),
			);
			expect(output.summary).toBe('Test with "quotes" and \\backslash');
		});
	});

	describe('Multiple Validation Errors', () => {
		it('should report all errors at once', () => {
			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				// Missing --summary, --type, --payload, --signature
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('--summary is required');
			expect(stderr).toContain('--type (signature type) is required');
			expect(stderr).toContain('--payload (signed payload) is required');
			expect(stderr).toContain('--signature (hex signature) is required');
		});
	});

	describe('Cryptographic Signature Verification', () => {
		it('should reject fabricated signatures that do not verify', () => {
			// This tests the core security feature: signatures must be real
			const payload = '{"commits":["abc123"]}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			// Use a fabricated 64-char hex signature that won't verify
			const fakeSignature =
				'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678';

			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'All checks passed',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				fakeSignature,
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('SIGNATURE VERIFICATION FAILED');
		});

		it('should reject signatures from wrong payload', () => {
			// Sign payload A, but pass payload B - should fail
			const payloadA = '{"commits":["abc123"]}';
			const payloadB = '{"commits":["def456"]}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const signatureForA = generateMockSignature(payloadA, sigType);

			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				sigType,
				'--payload',
				payloadB, // Different payload than what was signed
				'--signature',
				signatureForA,
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('SIGNATURE VERIFICATION FAILED');
		});

		it('should reject signatures from wrong type', () => {
			// Sign with type A, but claim type B - should fail
			const payload = '{"commits":["abc123"]}';
			const sigTypeA = 'QA_CLAIMS_AUDITOR';
			const sigTypeB = 'QA_CI_REQUIRED_TESTS';
			const signatureForTypeA = generateMockSignature(payload, sigTypeA);

			const { success, stderr } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'Test',
				'--type',
				sigTypeB, // Different type than what was signed
				'--payload',
				payload,
				'--signature',
				signatureForTypeA,
			]);

			expect(success).toBe(false);
			expect(stderr).toContain('SIGNATURE VERIFICATION FAILED');
		});

		it('should accept valid signatures', () => {
			const payload = '{"commits":["abc123"],"verdict":"APPROVED"}';
			const sigType = 'QA_CI_REQUIRED_TESTS';
			const validSignature = generateMockSignature(payload, sigType);

			const { success, stdout } = runScript([
				'review-ci-tests-required',
				'--verdict',
				'APPROVED',
				'--summary',
				'All checks passed',
				'--type',
				sigType,
				'--payload',
				payload,
				'--signature',
				validSignature,
			]);

			expect(success).toBe(true);
			expect(stdout).toContain('Output written to');
		});
	});
});
