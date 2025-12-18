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
		it('should have master-agent directory with required subdirectories', () => {
			expect(pathExists('.claude/agents/master-agent')).toBe(true);
			expect(pathExists('.claude/agents/master-agent/docs')).toBe(true);
			expect(pathExists('.claude/agents/master-agent/scripts')).toBe(true);
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

	describe('Master-Agent Files', () => {
		it('should have master-agent scripts', () => {
			expect(
				pathExists(
					'.claude/agents/master-agent/scripts/master-session-handover.sh',
				),
			).toBe(true);
			expect(
				pathExists(
					'.claude/agents/master-agent/scripts/master-session-start.sh',
				),
			).toBe(true);
		});
	});

	describe('Sub-Agent Files', () => {
		it('should have all 6 QA reviewer documentation files', () => {
			expect(pathExists('.claude/agents/sub-agent/docs/review-lead.md')).toBe(
				true,
			);
			expect(
				pathExists('.claude/agents/sub-agent/docs/review-claims-auditor.md'),
			).toBe(true);
			expect(
				pathExists(
					'.claude/agents/sub-agent/docs/review-contracts-boundaries.md',
				),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/docs/review-mechanics-content.md'),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/docs/review-infra-concurrency.md'),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/docs/review-tests-docs-dry.md'),
			).toBe(true);
		});

		it('should have safe-deployment-gate and review-ci-tests-required documentation', () => {
			expect(
				pathExists('.claude/agents/sub-agent/docs/safe-deployment-gate.md'),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/docs/review-ci-tests-required.md'),
			).toBe(true);
		});

		it('should have subagent scripts', () => {
			expect(pathExists('.claude/agents/sub-agent/scripts/sign.sh')).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/scripts/verify-and-push.sh'),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/scripts/verify-bulk-and-push.sh'),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/scripts/verify-bulk.sh'),
			).toBe(true);
			expect(
				pathExists(
					'.claude/agents/sub-agent/scripts/subagent-session-start.sh',
				),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/scripts/subagent-cleanup.sh'),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/scripts/write-output.sh'),
			).toBe(true);
			expect(
				pathExists(
					'.claude/agents/sub-agent/scripts/collect-phase1-assessments.sh',
				),
			).toBe(true);
			expect(
				pathExists('.claude/agents/sub-agent/scripts/check-prior-state.sh'),
			).toBe(true);
			expect(
				pathExists('.claude/agents/shared/scripts/cleanup-qa-outputs.sh'),
			).toBe(true);
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
			expect(pathExists('.claude/hooks/block-git-command.sh')).toBe(true);
			expect(pathExists('.claude/hooks/block-agent-access.sh')).toBe(true);
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

			expect(sessionStartupCommand).toContain(
				'master-agent/scripts/master-session-start.sh',
			);
			expect(sessionResumeCommand).toContain(
				'master-agent/scripts/master-session-handover.sh',
			);
			expect(subagentStartCommand).toContain(
				'sub-agent/scripts/subagent-session-start.sh',
			);
		});
	});

	describe('Old Paths Cleanup', () => {
		it('should NOT have old agent definition locations', () => {
			expect(pathExists('.claude/agents/code-reviewer.md')).toBe(false);
			expect(pathExists('.claude/agents/pusher.md')).toBe(false);
		});

		it('should NOT have old renamed docs (pusher → safe-deployment-gate, test-runner → review-ci-tests-required)', () => {
			expect(pathExists('.claude/agents/sub-agent/docs/pusher.md')).toBe(false);
			expect(pathExists('.claude/agents/sub-agent/docs/test-runner.md')).toBe(
				false,
			);
		});

		it('should NOT have legacy single code-reviewer', () => {
			expect(pathExists('.claude/agents/sub-agent/docs/code-reviewer.md')).toBe(
				false,
			);
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
