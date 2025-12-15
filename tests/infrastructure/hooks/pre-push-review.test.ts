import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Infrastructure Test: Pre-Push Hook
 *
 * Verifies that the pre-push-review hook correctly:
 * - Blocks direct git push commands
 * - Allows verify-and-push.sh script
 * - Allows git push --dry-run for testing
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const HOOK_SCRIPT = path.join(PROJECT_ROOT, '.claude/hooks/pre-push-review.sh');

describe('Infrastructure: Pre-Push Hook', () => {
	const testCommand = (
		command: string,
	): { blocked: boolean; output: string } => {
		const toolInput = JSON.stringify({
			tool_input: {
				command: command,
			},
		});

		try {
			const result = execSync(`echo '${toolInput}' | bash "${HOOK_SCRIPT}"`, {
				encoding: 'utf-8',
				stdio: 'pipe',
				cwd: PROJECT_ROOT,
			});
			return { blocked: false, output: result };
		} catch (error: unknown) {
			const err = error as {
				status?: number;
				stderr?: string;
				stdout?: string;
			};
			return {
				blocked: err.status === 2,
				output: err.stderr || err.stdout || '',
			};
		}
	};

	describe('Blocking Direct Git Push', () => {
		it('should block "git push" without arguments', () => {
			const { blocked } = testCommand('git push');
			expect(blocked).toBe(true);
		});

		it('should block "git push" with branch', () => {
			const { blocked } = testCommand('git push origin main');
			expect(blocked).toBe(true);
		});

		it('should block "git push" with flags', () => {
			const { blocked } = testCommand('git push -u origin feature/foo');
			expect(blocked).toBe(true);
		});

		it('should block "git push --force"', () => {
			const { blocked } = testCommand('git push --force');
			expect(blocked).toBe(true);
		});

		it('should provide helpful error message', () => {
			const { blocked, output } = testCommand('git push');
			expect(blocked).toBe(true);
			expect(output).toContain('PUSH BLOCKED');
			expect(output).toContain('verify-and-push.sh');
		});
	});

	describe('Allowing Legitimate Commands', () => {
		it('should allow verify-and-push.sh script', () => {
			const { blocked } = testCommand(
				'.claude/agents/sub-agent/scripts/verify-and-push.sh payload signature',
			);
			expect(blocked).toBe(false);
		});

		it('should allow git push --dry-run', () => {
			const { blocked } = testCommand('git push --dry-run origin main');
			expect(blocked).toBe(false);
		});

		it('should allow non-git-push commands', () => {
			expect(testCommand('git status').blocked).toBe(false);
			expect(testCommand('git commit -m "test"').blocked).toBe(false);
			expect(testCommand('git fetch').blocked).toBe(false);
			expect(testCommand('npm test').blocked).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should allow git commands that contain "push" but are not push', () => {
			expect(testCommand('git log --oneline | grep push').blocked).toBe(false);
		});

		it('should block push even with other commands chained', () => {
			const { blocked } = testCommand('git status && git push');
			expect(blocked).toBe(true);
		});
	});
});
