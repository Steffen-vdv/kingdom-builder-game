import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Infrastructure Test: Pre-Task-Tool Hook
 *
 * Verifies that the pre-task-tool hook correctly:
 * - Blocks model overrides for QA subagents
 * - Blocks invalid JSON input
 * - Blocks missing required fields per subagent type
 * - Allows valid inputs to pass through
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const HOOK_SCRIPT = path.join(PROJECT_ROOT, '.claude/hooks/pre-task-tool.sh');

interface HookResult {
	blocked: boolean;
	output: string;
	exitCode: number;
}

const testTaskInput = (
	subagentType: string,
	prompt: string | object,
	modelOverride?: string,
): HookResult => {
	const toolInput: {
		tool_name: string;
		tool_input: {
			subagent_type: string;
			prompt: string;
			model?: string;
		};
	} = {
		tool_name: 'Task',
		tool_input: {
			subagent_type: subagentType,
			prompt: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
		},
	};

	if (modelOverride) {
		toolInput.tool_input.model = modelOverride;
	}

	const inputJson = JSON.stringify(toolInput);

	try {
		const result = execSync(`echo '${inputJson}' | bash "${HOOK_SCRIPT}"`, {
			encoding: 'utf-8',
			stdio: 'pipe',
			cwd: PROJECT_ROOT,
		});
		return { blocked: false, output: result, exitCode: 0 };
	} catch (error: unknown) {
		const err = error as {
			status?: number;
			stderr?: string;
			stdout?: string;
		};
		return {
			blocked: err.status === 1,
			output: err.stdout || err.stderr || '',
			exitCode: err.status || 1,
		};
	}
};

describe('Infrastructure: Pre-Task-Tool Hook', () => {
	describe('Model Override Blocking', () => {
		const qaSubagents = [
			'review-ci-tests-required',
			'review-claims-auditor',
			'review-contracts-boundaries',
			'review-mechanics-content',
			'review-infra-concurrency',
			'review-tests-docs-dry',
			'review-lead',
			'safe-deployment-gate',
		];

		it.each(qaSubagents)('should block model override for %s', (subagent) => {
			const prompt =
				subagent === 'review-lead'
					? { branch: 'test', commits: [], approvals_json: [] }
					: subagent === 'safe-deployment-gate'
						? { branch: 'test', approval: {} }
						: subagent === 'review-ci-tests-required'
							? { branch: 'test', commits: [], files_changed: [] }
							: {
									branch: 'test',
									commits: [],
									original_request: 'test',
									files_changed: [],
								};

			const { blocked, output } = testTaskInput(subagent, prompt, 'haiku');
			expect(blocked).toBe(true);
			expect(output).toContain('Model override');
			expect(output).toContain('haiku');
			expect(output).toContain('not allowed');
		});

		it('should allow QA subagents without model override', () => {
			const { blocked } = testTaskInput('review-ci-tests-required', {
				branch: 'test',
				commits: [],
				files_changed: [],
			});
			expect(blocked).toBe(false);
		});

		it('should allow model override for non-QA subagents', () => {
			const { blocked } = testTaskInput(
				'general-purpose',
				'some prompt text',
				'haiku',
			);
			expect(blocked).toBe(false);
		});
	});

	describe('JSON Validation', () => {
		it('should block invalid JSON input', () => {
			const { blocked, output } = testTaskInput(
				'review-claims-auditor',
				'not valid json {{{',
			);
			expect(blocked).toBe(true);
			expect(output).toContain('not valid JSON');
		});

		it('should block empty string prompt', () => {
			const { blocked } = testTaskInput('review-claims-auditor', '');
			expect(blocked).toBe(true);
		});
	});

	describe('Required Field Validation', () => {
		it('should block missing branch field', () => {
			const { blocked, output } = testTaskInput('review-claims-auditor', {
				commits: [],
				original_request: 'test',
			});
			expect(blocked).toBe(true);
			expect(output).toContain('branch');
		});

		it('should block review-ci-tests-required missing files_changed', () => {
			const { blocked, output } = testTaskInput('review-ci-tests-required', {
				branch: 'test',
				commits: [],
			});
			expect(blocked).toBe(true);
			expect(output).toContain('files_changed');
		});

		it('should block Phase 1 reviewers missing original_request', () => {
			const { blocked, output } = testTaskInput('review-claims-auditor', {
				branch: 'test',
				commits: [],
				files_changed: [],
			});
			expect(blocked).toBe(true);
			expect(output).toContain('original_request');
		});

		it('should block review-lead missing approvals_json', () => {
			const { blocked, output } = testTaskInput('review-lead', {
				branch: 'test',
				commits: [],
				original_request: 'test',
			});
			expect(blocked).toBe(true);
			expect(output).toContain('approvals_json');
		});

		it('should block safe-deployment-gate missing approval/override_token', () => {
			const { blocked, output } = testTaskInput('safe-deployment-gate', {
				branch: 'test',
			});
			expect(blocked).toBe(true);
			expect(output).toContain('approval');
		});
	});

	describe('Valid Inputs', () => {
		it('should allow valid review-ci-tests-required input', () => {
			const { blocked } = testTaskInput('review-ci-tests-required', {
				branch: 'feature/test',
				commits: ['abc123'],
				files_changed: ['src/foo.ts'],
			});
			expect(blocked).toBe(false);
		});

		it('should allow valid Phase 1 reviewer input', () => {
			const { blocked } = testTaskInput('review-claims-auditor', {
				branch: 'feature/test',
				commits: ['abc123'],
				original_request: 'Add feature X',
				changes_summary: 'Implemented X',
				files_changed: ['src/foo.ts'],
			});
			expect(blocked).toBe(false);
		});

		it('should allow valid review-lead input', () => {
			const { blocked } = testTaskInput('review-lead', {
				branch: 'feature/test',
				commits: ['abc123'],
				approvals_json: [
					{ type: 'QA_CI_REQUIRED_TESTS', payload: '', signature: '' },
				],
				original_request: 'Add feature X',
				changes_summary: 'Implemented X',
			});
			expect(blocked).toBe(false);
		});

		it('should allow safe-deployment-gate with approval', () => {
			const { blocked } = testTaskInput('safe-deployment-gate', {
				branch: 'feature/test',
				approval: { type: 'QA_FINAL_SIGNATORY', payload: '', signature: '' },
			});
			expect(blocked).toBe(false);
		});

		it('should allow safe-deployment-gate with override_token', () => {
			const { blocked } = testTaskInput('safe-deployment-gate', {
				branch: 'feature/test',
				override_token: 'user-provided-token',
			});
			expect(blocked).toBe(false);
		});
	});

	describe('Non-QA Subagents', () => {
		it('should allow any input for non-tracked subagents', () => {
			const { blocked } = testTaskInput('general-purpose', 'any string prompt');
			expect(blocked).toBe(false);
		});

		it('should allow Explore subagent without validation', () => {
			const { blocked } = testTaskInput('Explore', 'find all typescript files');
			expect(blocked).toBe(false);
		});
	});

	describe('Exit Codes', () => {
		it('should exit 1 when blocking for model override', () => {
			const { exitCode } = testTaskInput(
				'review-claims-auditor',
				{
					branch: 'test',
					commits: [],
					original_request: 'test',
					files_changed: [],
				},
				'haiku',
			);
			expect(exitCode).toBe(1);
		});

		it('should exit 1 when blocking for invalid JSON', () => {
			const { exitCode } = testTaskInput(
				'review-claims-auditor',
				'invalid json',
			);
			expect(exitCode).toBe(1);
		});

		it('should exit 0 when allowing valid input', () => {
			const { exitCode } = testTaskInput('review-ci-tests-required', {
				branch: 'test',
				commits: [],
				files_changed: [],
			});
			expect(exitCode).toBe(0);
		});
	});
});
