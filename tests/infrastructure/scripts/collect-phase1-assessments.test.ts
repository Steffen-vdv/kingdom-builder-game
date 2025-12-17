import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: collect-phase1-assessments.sh
 *
 * Verifies that the Phase 1 collection script correctly:
 * - Validates all 6 output files exist
 * - Validates verdict is "APPROVED" (exact string)
 * - Validates required signature fields are present
 * - Returns properly formatted approvals_json array
 * - Exits with error on invalid/missing inputs
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT_PATH = path.join(
	PROJECT_ROOT,
	'.claude/agents/sub-agent/scripts/collect-phase1-assessments.sh',
);
// Use PID-namespaced directory to isolate tests from production path.
// This prevents test cleanup from deleting other agents' output files
// when CI agent runs tests in parallel with other Phase 1 reviewers.
const OUTPUT_DIR = `/tmp/claude/test-${process.pid}/output`;

const AGENTS = [
	'review-ci-tests-required',
	'review-claims-auditor',
	'review-contracts-boundaries',
	'review-mechanics-content',
	'review-infra-concurrency',
	'review-tests-docs-dry',
];

const SIGNATURE_TYPES: Record<string, string> = {
	'review-ci-tests-required': 'QA_CI_REQUIRED_TESTS',
	'review-claims-auditor': 'QA_CLAIMS_AUDITOR',
	'review-contracts-boundaries': 'QA_CONTRACTS_BOUNDARIES',
	'review-mechanics-content': 'QA_MECHANICS_CONTENT',
	'review-infra-concurrency': 'QA_INFRA_CONCURRENCY',
	'review-tests-docs-dry': 'QA_TESTS_DOCS_DRY',
};

function createValidOutput(agent: string): object {
	return {
		agent,
		verdict: 'APPROVED',
		summary: `Test approval for ${agent}`,
		signature_type: SIGNATURE_TYPES[agent],
		payload: JSON.stringify({
			commits: ['abc123'],
			verdict: 'APPROVED',
			summary: 'Test',
		}),
		signature: 'a'.repeat(64),
		blockers: null,
		questions: null,
		details: { test: true },
	};
}

function writeOutput(agent: string, content: object | string): void {
	const filePath = path.join(OUTPUT_DIR, `${agent}.json`);
	const data = typeof content === 'string' ? content : JSON.stringify(content);
	fs.writeFileSync(filePath, data);
}

function runScript(): { success: boolean; stdout: string; stderr: string } {
	try {
		const stdout = execSync(`bash "${SCRIPT_PATH}"`, {
			encoding: 'utf-8',
			stdio: 'pipe',
			cwd: PROJECT_ROOT,
			env: { ...process.env, PHASE1_OUTPUT_DIR: OUTPUT_DIR },
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

/**
 * Clean the entire output directory to ensure test isolation.
 * This removes ALL files, not just the 6 Phase 1 agents, to prevent
 * interference from stale files left by actual agent runs.
 */
function cleanOutputDirectory(): void {
	if (fs.existsSync(OUTPUT_DIR)) {
		const files = fs.readdirSync(OUTPUT_DIR);
		for (const file of files) {
			fs.unlinkSync(path.join(OUTPUT_DIR, file));
		}
	}
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

describe('Infrastructure: collect-phase1-assessments.sh', () => {
	beforeEach(() => {
		cleanOutputDirectory();
	});

	afterEach(() => {
		cleanOutputDirectory();
	});

	describe('Happy Path', () => {
		it('should return valid JSON array when all 6 files are valid', () => {
			// Create all 6 valid outputs
			for (const agent of AGENTS) {
				writeOutput(agent, createValidOutput(agent));
			}

			const { success, stdout } = runScript();
			expect(success).toBe(true);

			const result = JSON.parse(stdout.trim());
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(6);
		});

		it('should return approvals with correct structure', () => {
			for (const agent of AGENTS) {
				writeOutput(agent, createValidOutput(agent));
			}

			const { success, stdout } = runScript();
			expect(success).toBe(true);

			const result = JSON.parse(stdout.trim());
			for (const approval of result) {
				expect(approval).toHaveProperty('payload');
				expect(approval).toHaveProperty('signature');
				expect(approval).toHaveProperty('type');
				expect(typeof approval.payload).toBe('string');
				expect(typeof approval.signature).toBe('string');
				expect(typeof approval.type).toBe('string');
			}
		});

		it('should map signature_type to type field', () => {
			for (const agent of AGENTS) {
				writeOutput(agent, createValidOutput(agent));
			}

			const { success, stdout } = runScript();
			expect(success).toBe(true);

			const result = JSON.parse(stdout.trim());
			const types = result.map((a: { type: string }) => a.type);

			expect(types).toContain('QA_CI_REQUIRED_TESTS');
			expect(types).toContain('QA_CLAIMS_AUDITOR');
			expect(types).toContain('QA_CONTRACTS_BOUNDARIES');
			expect(types).toContain('QA_MECHANICS_CONTENT');
			expect(types).toContain('QA_INFRA_CONCURRENCY');
			expect(types).toContain('QA_TESTS_DOCS_DRY');
		});
	});

	describe('Missing Files', () => {
		it('should fail when one file is missing', () => {
			// Create only 5 files
			for (const agent of AGENTS.slice(0, 5)) {
				writeOutput(agent, createValidOutput(agent));
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('Missing');
			expect(stderr).toContain('review-tests-docs-dry');
		});

		it('should fail when all files are missing', () => {
			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('PHASE 1 COLLECTION FAILED');
		});
	});

	describe('Invalid Verdict', () => {
		it('should fail when verdict is "APPROVE" instead of "APPROVED"', () => {
			for (const agent of AGENTS) {
				const output = createValidOutput(agent);
				if (agent === 'review-claims-auditor') {
					(output as { verdict: string }).verdict = 'APPROVE';
				}
				writeOutput(agent, output);
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('review-claims-auditor');
			expect(stderr).toContain("verdict is 'APPROVE'");
		});

		it('should fail when verdict is "BLOCKED"', () => {
			for (const agent of AGENTS) {
				const output = createValidOutput(agent);
				if (agent === 'review-ci-tests-required') {
					(output as { verdict: string }).verdict = 'BLOCKED';
				}
				writeOutput(agent, output);
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('review-ci-tests-required');
			expect(stderr).toContain("verdict is 'BLOCKED'");
		});

		it('should fail when verdict field is missing', () => {
			for (const agent of AGENTS) {
				const output = createValidOutput(agent);
				if (agent === 'review-mechanics-content') {
					delete (output as Record<string, unknown>).verdict;
				}
				writeOutput(agent, output);
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('review-mechanics-content');
		});
	});

	describe('Missing Signature Fields', () => {
		it('should fail when payload is missing', () => {
			for (const agent of AGENTS) {
				const output = createValidOutput(agent);
				if (agent === 'review-infra-concurrency') {
					delete (output as Record<string, unknown>).payload;
				}
				writeOutput(agent, output);
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('review-infra-concurrency');
			expect(stderr).toContain('payload');
		});

		it('should fail when signature is missing', () => {
			for (const agent of AGENTS) {
				const output = createValidOutput(agent);
				if (agent === 'review-tests-docs-dry') {
					delete (output as Record<string, unknown>).signature;
				}
				writeOutput(agent, output);
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('review-tests-docs-dry');
			expect(stderr).toContain('signature');
		});

		it('should fail when signature_type is missing', () => {
			for (const agent of AGENTS) {
				const output = createValidOutput(agent);
				if (agent === 'review-contracts-boundaries') {
					delete (output as Record<string, unknown>).signature_type;
				}
				writeOutput(agent, output);
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('review-contracts-boundaries');
			expect(stderr).toContain('signature_type');
		});
	});

	describe('Invalid JSON', () => {
		it('should fail when file contains invalid JSON', () => {
			for (const agent of AGENTS) {
				if (agent === 'review-claims-auditor') {
					writeOutput(agent, 'not valid json {{{');
				} else {
					writeOutput(agent, createValidOutput(agent));
				}
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('Invalid JSON');
		});

		it('should fail when file is empty', () => {
			for (const agent of AGENTS) {
				if (agent === 'review-mechanics-content') {
					writeOutput(agent, '');
				} else {
					writeOutput(agent, createValidOutput(agent));
				}
			}

			const { success } = runScript();
			expect(success).toBe(false);
		});
	});

	describe('Multiple Errors', () => {
		it('should report all errors when multiple files are invalid', () => {
			// Create only 4 valid files, skip 2
			for (const agent of AGENTS.slice(0, 4)) {
				writeOutput(agent, createValidOutput(agent));
			}

			const { success, stderr } = runScript();
			expect(success).toBe(false);
			expect(stderr).toContain('review-infra-concurrency');
			expect(stderr).toContain('review-tests-docs-dry');
		});
	});
});
