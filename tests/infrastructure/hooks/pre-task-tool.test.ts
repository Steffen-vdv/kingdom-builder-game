import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Infrastructure Test: Pre-Task-Tool Hook
 *
 * Verifies that the pre-task-tool hook correctly:
 * - Blocks model overrides for QA subagents
 * - Writes canonical input for QA subagents
 * - Gates safe-deployment-gate by verifying review-lead.json
 * - Allows non-QA inputs to pass through
 *
 * Note: The hook no longer validates JSON structure or required fields.
 * Canonical input is computed by the hook, not validated from the prompt.
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
		// QA subagents that should block model overrides
		// Includes Phase 1 reviewers, review-lead, and safe-deployment-gate
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
			// Prompt content doesn't matter for model override blocking
			const prompt = { branch: 'test', commits: [] };

			const { blocked, output } = testTaskInput(subagent, prompt, 'haiku');
			expect(blocked).toBe(true);
			expect(output).toContain('Model override');
			expect(output).toContain('haiku');
			expect(output).toContain('not allowed');
		});

		it('should allow QA subagents without model override', () => {
			const { blocked } = testTaskInput('review-ci-tests-required', {
				branch: 'test',
				commits: ['abc123'],
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

	describe('Safe Deployment Gate Gating', () => {
		it('should block safe-deployment-gate when review-lead.json is missing', () => {
			// safe-deployment-gate requires review-lead.json to exist
			// Without it, the hook should block
			const { blocked, output } = testTaskInput('safe-deployment-gate', {
				branch: 'test-branch',
			});
			expect(blocked).toBe(true);
			expect(output).toContain('review-lead.json');
		});
	});

	describe('Exit Codes', () => {
		it('should exit 1 when blocking for model override', () => {
			const { exitCode } = testTaskInput(
				'review-claims-auditor',
				{ branch: 'test', commits: [] },
				'haiku',
			);
			expect(exitCode).toBe(1);
		});

		it('should exit 0 when allowing valid input', () => {
			const { exitCode } = testTaskInput('review-ci-tests-required', {
				branch: 'test',
				commits: ['abc123'],
			});
			expect(exitCode).toBe(0);
		});

		it('should exit 1 when safe-deployment-gate gating fails', () => {
			const { exitCode } = testTaskInput('safe-deployment-gate', {});
			expect(exitCode).toBe(1);
		});
	});
});
