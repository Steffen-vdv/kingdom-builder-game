import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: Verify Script Access Control
 *
 * Tests the marker-based access control system that prevents:
 * - Main agents from accessing subagent scripts
 * - Subagents from accessing main agent scripts
 *
 * This verifies the security model implemented in
 * .claude/hooks/verify-script-access.sh
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const MARKER_FILE = path.join(PROJECT_ROOT, '.claude/.__ctx_9f8e7d__');
const HOOK_SCRIPT = path.join(
	PROJECT_ROOT,
	'.claude/hooks/verify-script-access.sh',
);

describe('Infrastructure: Script Access Control', () => {
	// Helper to set agent marker
	const setAgentMarker = (type: 'main' | 'sub' | 'none') => {
		if (type === 'none') {
			if (fs.existsSync(MARKER_FILE)) {
				fs.unlinkSync(MARKER_FILE);
			}
		} else {
			const marker = type === 'sub' ? 's_3k2' : 'm_1a8';
			fs.writeFileSync(MARKER_FILE, marker, 'utf-8');
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
		// Clean up marker file before each test
		if (fs.existsSync(MARKER_FILE)) {
			fs.unlinkSync(MARKER_FILE);
		}
	});

	afterEach(() => {
		// Clean up marker file after each test
		if (fs.existsSync(MARKER_FILE)) {
			fs.unlinkSync(MARKER_FILE);
		}
	});

	describe('Subagent Script Protection', () => {
		const SUBAGENT_SCRIPTS = [
			'.claude/agents/sub-agent/scripts/sign.sh',
			'.claude/agents/sub-agent/scripts/verify.sh',
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

	describe('Main Agent Script Protection', () => {
		const MAIN_AGENT_SCRIPTS = [
			'.claude/agents/main-agent/scripts/msh.sh',
			'.claude/agents/main-agent/scripts/mss.sh',
		];

		it('should allow main agents to access main agent scripts', () => {
			setAgentMarker('main');

			for (const script of MAIN_AGENT_SCRIPTS) {
				const command = `bash ${script}`;
				const allowed = testHookAllows(command);
				expect(allowed).toBe(true);
			}
		});

		it('should block subagents from accessing main agent scripts', () => {
			setAgentMarker('sub');

			for (const script of MAIN_AGENT_SCRIPTS) {
				const command = `bash ${script}`;
				const blocked = testHookBlocks(command);
				expect(blocked).toBe(true);
			}
		});

		it('should allow agents with no marker to access main agent scripts', () => {
			setAgentMarker('none');

			for (const script of MAIN_AGENT_SCRIPTS) {
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
