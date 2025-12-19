import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Infrastructure Test: Block Git Command Hook
 *
 * Verifies that the block-git-command hook correctly:
 * - Blocks direct git push commands
 * - Blocks git push in command chains (&&, ||, ;, |)
 * - Allows verify-and-push.sh script (Phase 3)
 * - Allows git push --dry-run for testing
 * - Provides helpful three-phase workflow guidance
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const HOOK_SCRIPT = path.join(
	PROJECT_ROOT,
	'.claude/hooks/block-git-command.sh',
);

describe('Infrastructure: Block Git Command Hook', () => {
	const testCommand = (
		command: string,
	): { blocked: boolean; output: string } => {
		const toolInput = JSON.stringify({
			tool_name: 'Bash',
			tool_input: {
				command: command,
			},
		});

		try {
			const result = execSync(`echo '${toolInput}' | bash "${HOOK_SCRIPT}"`, {
				encoding: 'utf-8',
				stdio: 'pipe',
				cwd: PROJECT_ROOT,
				env: {
					...process.env,
					CLAUDE_PROJECT_DIR: PROJECT_ROOT,
				},
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

		it('should block git push with -C directory flag (security bypass fix)', () => {
			const { blocked } = testCommand(
				'git -C /home/user/repo push origin main',
			);
			expect(blocked).toBe(true);
		});

		it('should block git push with --git-dir flag', () => {
			const { blocked } = testCommand('git --git-dir=/path/.git push');
			expect(blocked).toBe(true);
		});

		it('should block git push with multiple global flags', () => {
			const { blocked } = testCommand(
				'git -C /path --no-pager push origin feature',
			);
			expect(blocked).toBe(true);
		});

		it('should provide helpful error message', () => {
			const { blocked, output } = testCommand('git push');
			expect(blocked).toBe(true);
			expect(output).toContain('BLOCKED');
			expect(output).toContain('verified push workflow');
		});

		it('should describe three-phase workflow in error message', () => {
			const { blocked, output } = testCommand('git push origin main');
			expect(blocked).toBe(true);
			expect(output).toContain('Phase 1');
			expect(output).toContain('Phase 2');
			expect(output).toContain('Phase 3');
			expect(output).toContain('review-lead');
			expect(output).toContain('safe-deployment-gate');
		});
	});

	describe('Allowing Legitimate Commands', () => {
		it('should allow verify-and-push.sh script', () => {
			const { blocked } = testCommand(
				'.claude/agents/sub-agent/scripts/verify-and-push.sh --from-disk',
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

		it('should allow push in quoted string (not a command)', () => {
			expect(testCommand('git commit -m "fix: push"').blocked).toBe(false);
		});
	});

	describe('Command Chain Detection (bashlex)', () => {
		it('should block push in && chain: git status && git push', () => {
			const { blocked } = testCommand('git status && git push');
			expect(blocked).toBe(true);
		});

		it('should block push in || chain: git push || echo "failed"', () => {
			const { blocked } = testCommand('git push || echo "failed"');
			expect(blocked).toBe(true);
		});

		it('should block push in ; chain: git status; git push', () => {
			const { blocked } = testCommand('git status; git push');
			expect(blocked).toBe(true);
		});

		it('should block push in | chain: echo "y" | git push', () => {
			const { blocked } = testCommand('echo "y" | git push');
			expect(blocked).toBe(true);
		});

		it('should block push with no spaces: git status&&git push', () => {
			const { blocked } = testCommand('git status&&git push');
			expect(blocked).toBe(true);
		});

		it('should block push in long chain: git fetch && git status && git push', () => {
			const { blocked } = testCommand('git fetch && git status && git push');
			expect(blocked).toBe(true);
		});

		it('should block push even when later in chain', () => {
			const { blocked } = testCommand(
				'npm test && npm build && git add . && git commit -m "fix" && git push',
			);
			expect(blocked).toBe(true);
		});

		it('should allow safe chains without push', () => {
			expect(testCommand('git status && git fetch').blocked).toBe(false);
			expect(testCommand('git add . && git commit -m "test"').blocked).toBe(
				false,
			);
		});

		it('should not be fooled by push in quoted strings within chains', () => {
			expect(testCommand('git commit -m "push" && git status').blocked).toBe(
				false,
			);
		});

		it('should allow dry-run push in chain', () => {
			expect(
				testCommand('git status && git push --dry-run origin main').blocked,
			).toBe(false);
		});
	});
});
