import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: Agent Path Validation
 *
 * Verifies that all paths referenced in agent configuration and documentation
 * actually exist on the filesystem. This catches broken references after
 * refactoring or reorganization.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

const pathExists = (relativePath: string): boolean => {
	const fullPath = path.join(PROJECT_ROOT, relativePath);
	return fs.existsSync(fullPath);
};

describe('Infrastructure: Agent Path Validation', () => {
	describe('Agent Directory Structure', () => {
		it('should have main-agent directory with required subdirectories', () => {
			expect(pathExists('.claude/agents/main-agent')).toBe(true);
			expect(pathExists('.claude/agents/main-agent/docs')).toBe(true);
			expect(pathExists('.claude/agents/main-agent/scripts')).toBe(true);
		});

		it('should have sub-agent directory with required subdirectories', () => {
			expect(pathExists('.claude/agents/sub-agent')).toBe(true);
			expect(pathExists('.claude/agents/sub-agent/docs')).toBe(true);
			expect(pathExists('.claude/agents/sub-agent/scripts')).toBe(true);
		});

		it('should have shared directory with docs', () => {
			expect(pathExists('.claude/agents/shared')).toBe(true);
			expect(pathExists('.claude/agents/shared/docs')).toBe(true);
		});
	});

	describe('Main Agent Files', () => {
		it('should have main agent documentation', () => {
			expect(
				pathExists('.claude/agents/main-agent/docs/agent-task-workflow.md'),
			).toBe(true);
		});

		it('should have main agent scripts', () => {
			expect(pathExists('.claude/agents/main-agent/scripts/msh.sh')).toBe(true);
			expect(pathExists('.claude/agents/main-agent/scripts/mss.sh')).toBe(true);
		});
	});

	describe('Sub-Agent Files', () => {
		it('should have subagent documentation', () => {
			expect(pathExists('.claude/agents/sub-agent/docs/code-reviewer.md')).toBe(
				true,
			);
			expect(pathExists('.claude/agents/sub-agent/docs/pusher.md')).toBe(true);
		});

		it('should have subagent scripts with new names', () => {
			expect(pathExists('.claude/agents/sub-agent/scripts/sign.sh')).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/scripts/verify-and-push.sh'),
			).toBe(true);
			expect(pathExists('.claude/agents/sub-agent/scripts/sss.sh')).toBe(true);
		});

		it('should NOT have old script names', () => {
			expect(pathExists('scripts/subagent/qa-sign.sh')).toBe(false);
			expect(pathExists('scripts/subagent/verified-push.sh')).toBe(false);
			expect(pathExists('scripts/subagent/verify-approval.sh')).toBe(false);
		});
	});

	describe('Shared Files', () => {
		it('should have shared protocol documentation with new name', () => {
			expect(
				pathExists(
					'.claude/agents/shared/docs/agent-intercommunication-protocols.md',
				),
			).toBe(true);
		});

		it('should NOT have old protocol doc name', () => {
			expect(pathExists('docs/subagent-protocols.md')).toBe(false);
		});
	});

	describe('Hook Files', () => {
		it('should have security hooks', () => {
			expect(pathExists('.claude/hooks/verify-script-access.sh')).toBe(true);
			expect(pathExists('.claude/hooks/pre-push-review.sh')).toBe(true);
			expect(pathExists('.claude/hooks/block-marker-access.sh')).toBe(true);
			expect(pathExists('.claude/hooks/block-setup-scripts.sh')).toBe(true);
			expect(pathExists('.claude/hooks/block-direct-downloads.sh')).toBe(true);
		});
	});

	describe('Configuration Files', () => {
		it('should have settings.json with correct hook paths', () => {
			expect(pathExists('.claude/settings.json')).toBe(true);

			const settingsPath = path.join(PROJECT_ROOT, '.claude/settings.json');
			const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

			// Verify hook paths reference new structure
			const sessionStartupCommand =
				settings.hooks.SessionStart[0].hooks[0].command;
			const sessionResumeCommand =
				settings.hooks.SessionStart[1].hooks[0].command;
			const subagentStartCommand =
				settings.hooks.SubagentStart[0].hooks[0].command;

			expect(sessionStartupCommand).toContain('main-agent/scripts/mss.sh');
			expect(sessionResumeCommand).toContain('main-agent/scripts/msh.sh');
			expect(subagentStartCommand).toContain('sub-agent/scripts/sss.sh');
		});
	});

	describe('Old Paths Cleanup', () => {
		it('should NOT have old agent definition locations', () => {
			expect(pathExists('.claude/agents/code-reviewer.md')).toBe(false);
			expect(pathExists('.claude/agents/pusher.md')).toBe(false);
		});

		it('should NOT have old script locations', () => {
			expect(pathExists('.claude/msh.sh')).toBe(false);
			expect(pathExists('.claude/mss.sh')).toBe(false);
			expect(pathExists('.claude/sss.sh')).toBe(false);
		});

		it('should NOT have old workflow doc location', () => {
			expect(pathExists('docs/agent-task-workflow.md')).toBe(false);
		});
	});
});
