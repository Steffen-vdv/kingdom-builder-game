import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Infrastructure Test: Verify Script Access Control
 *
 * Tests the context-manager-based access control system that prevents:
 * - Hypervisor from accessing subagent scripts
 * - Subagents from accessing hypervisor scripts
 *
 * This verifies the security model implemented in
 * .claude/hooks/verify-script-access.sh by managing agent context via
 * the context-manager scripts (.claude/agents/shared/scripts/).
 *
 * Context state: XDG_RUNTIME_DIR/claude/context-manager/state.json
 * with atomic access via file locking.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const HOOK_SCRIPT = path.join(
	PROJECT_ROOT,
	'.claude/hooks/verify-script-access.sh',
);
const REGISTER_HYPERVISOR_SCRIPT = path.join(
	PROJECT_ROOT,
	'.claude/agents/shared/scripts/context-manager/register-hypervisor.sh',
);
const REGISTER_SUBAGENT_SCRIPT = path.join(
	PROJECT_ROOT,
	'.claude/agents/shared/scripts/context-manager/register-subagent.sh',
);

describe('Infrastructure: Script Access Control', () => {
	// Helper to set agent context via context-manager scripts
	const setAgentMarker = (type: 'main' | 'sub' | 'none') => {
		try {
			if (type === 'none' || type === 'main') {
				// Reset to hypervisor context with subagent_count = 0
				execSync(`bash "${REGISTER_HYPERVISOR_SCRIPT}"`, {
					encoding: 'utf-8',
					stdio: 'pipe',
				});
			}

			if (type === 'sub') {
				// First ensure we start from hypervisor
				execSync(`bash "${REGISTER_HYPERVISOR_SCRIPT}"`, {
					encoding: 'utf-8',
					stdio: 'pipe',
				});
				// Then increment to subagent context
				execSync(`bash "${REGISTER_SUBAGENT_SCRIPT}"`, {
					encoding: 'utf-8',
					stdio: 'pipe',
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to set agent marker to '${type}': ${errorMessage}`,
			);
		}
	};

	// Helper to test hook blocking
	const testHookBlocks = (command: string): boolean => {
		try {
			execSync(
				`TOOL_INPUT_COMMAND="${command}" CLAUDE_PROJECT_DIR="${PROJECT_ROOT}" bash "${HOOK_SCRIPT}"`,
				{ encoding: 'utf-8', stdio: 'pipe' },
			);
			return false; // Hook did not block
		} catch {
			// Exit code 2 means blocked
			return true;
		}
	};

	// Helper to test hook allows
	const testHookAllows = (command: string): boolean => {
		try {
			execSync(
				`TOOL_INPUT_COMMAND="${command}" CLAUDE_PROJECT_DIR="${PROJECT_ROOT}" bash "${HOOK_SCRIPT}"`,
				{ encoding: 'utf-8', stdio: 'pipe' },
			);
			return true; // Hook allowed
		} catch {
			return false; // Hook blocked
		}
	};

	beforeEach(() => {
		// Reset context to hypervisor before each test for clean state
		try {
			execSync(`bash "${REGISTER_HYPERVISOR_SCRIPT}"`, {
				encoding: 'utf-8',
				stdio: 'pipe',
			});
		} catch {
			// Initialization may fail on first run, that's ok
		}
	});

	afterEach(() => {
		// Reset context to hypervisor after each test for clean state
		try {
			execSync(`bash "${REGISTER_HYPERVISOR_SCRIPT}"`, {
				encoding: 'utf-8',
				stdio: 'pipe',
			});
		} catch {
			// Cleanup errors are non-fatal
		}
	});

	describe('Subagent Script Protection', () => {
		const SUBAGENT_SCRIPTS = [
			'.claude/agents/sub-agent/scripts/sign.sh',
			'.claude/agents/sub-agent/scripts/verify-and-push.sh',
			'.claude/agents/sub-agent/scripts/sss.sh',
		];

		it('should block main agents from accessing subagent scripts', () => {
			setAgentMarker('main');

			for (const script of SUBAGENT_SCRIPTS) {
				const command = `bash ${script}`;
				const blocked = testHookBlocks(command);
				expect(blocked).toBe(true);
			}
		});

		it('should allow subagents to access subagent scripts', () => {
			setAgentMarker('sub');

			for (const script of SUBAGENT_SCRIPTS) {
				const command = `bash ${script}`;
				const allowed = testHookAllows(command);
				expect(allowed).toBe(true);
			}
		});

		it('should block agents with no marker from accessing subagent scripts', () => {
			setAgentMarker('none');

			for (const script of SUBAGENT_SCRIPTS) {
				const command = `bash ${script}`;
				const blocked = testHookBlocks(command);
				expect(blocked).toBe(true);
			}
		});
	});

	describe('Hypervisor Script Protection', () => {
		const HYPERVISOR_SCRIPTS = [
			'.claude/agents/hypervisor/scripts/msh.sh',
			'.claude/agents/hypervisor/scripts/mss.sh',
		];

		it('should allow hypervisor to access hypervisor scripts', () => {
			setAgentMarker('main');

			for (const script of HYPERVISOR_SCRIPTS) {
				const command = `bash ${script}`;
				const allowed = testHookAllows(command);
				expect(allowed).toBe(true);
			}
		});

		it('should block subagents from accessing main agent scripts', () => {
			setAgentMarker('sub');

			for (const script of HYPERVISOR_SCRIPTS) {
				const command = `bash ${script}`;
				const blocked = testHookBlocks(command);
				expect(blocked).toBe(true);
			}
		});

		it('should allow agents with no marker to access main agent scripts', () => {
			setAgentMarker('none');

			for (const script of HYPERVISOR_SCRIPTS) {
				const command = `bash ${script}`;
				const allowed = testHookAllows(command);
				expect(allowed).toBe(true);
			}
		});
	});

	describe('Unprotected Commands', () => {
		it('should allow any command not in agent directories', () => {
			setAgentMarker('main');
			expect(testHookAllows('ls -la')).toBe(true);
			expect(testHookAllows('git status')).toBe(true);
			expect(testHookAllows('npm test')).toBe(true);

			setAgentMarker('sub');
			expect(testHookAllows('ls -la')).toBe(true);
			expect(testHookAllows('git status')).toBe(true);
			expect(testHookAllows('npm test')).toBe(true);
		});
	});
});
