import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: UserPromptSubmit Hook - Stale Context Recovery
 *
 * Verifies that user-prompt-submit.sh correctly recovers from stale context
 * state left behind when a Task is interrupted (SubagentStop doesn't fire
 * on interruption).
 *
 * The fix leverages a key invariant: UserPromptSubmit only fires in
 * master-agent context. If state says "subagent" but we're receiving a
 * user prompt, the state is stale and should be reset.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const USER_PROMPT_SUBMIT = path.join(
	PROJECT_ROOT,
	'.claude/agents/master-agent/scripts/user-prompt-submit.sh',
);
const CTX_MGR = path.join(
	PROJECT_ROOT,
	'.claude/agents/shared/scripts/context-manager',
);

// Use PID-namespaced directories for test isolation
// Context-manager uses: ${XDG_RUNTIME_DIR:-/tmp}/claude/context-manager
// So we set XDG_RUNTIME_DIR to isolate tests
const TEST_BASE = `/tmp/test-ups-${process.pid}`;
const CTX_STATE_DIR = `${TEST_BASE}/claude/context-manager`;
const STATE_FILE = `${CTX_STATE_DIR}/state.json`;

interface RunResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
}

function runUserPromptSubmit(promptJson: string): RunResult {
	try {
		const stdout = execSync(
			`echo '${promptJson.replace(/'/g, "'\\''")}' | bash "${USER_PROMPT_SUBMIT}"`,
			{
				encoding: 'utf-8',
				stdio: 'pipe',
				cwd: PROJECT_ROOT,
				env: {
					...process.env,
					CLAUDE_PROJECT_DIR: PROJECT_ROOT,
					// Context-manager uses ${XDG_RUNTIME_DIR:-/tmp}/claude/context-manager
					XDG_RUNTIME_DIR: TEST_BASE,
				},
			},
		);
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

function getContext(): string {
	const result = execSync(`bash "${CTX_MGR}/get-context.sh"`, {
		encoding: 'utf-8',
		stdio: 'pipe',
		cwd: PROJECT_ROOT,
		env: {
			...process.env,
			CLAUDE_PROJECT_DIR: PROJECT_ROOT,
			XDG_RUNTIME_DIR: TEST_BASE,
		},
	});
	return result.trim();
}

function setStaleSubagentContext(): void {
	fs.mkdirSync(CTX_STATE_DIR, { recursive: true });
	fs.writeFileSync(
		STATE_FILE,
		JSON.stringify({
			context: 'subagent',
			subagent_count: 1,
			last_updated: new Date().toISOString(),
		}),
	);
}

function setMasterAgentContext(): void {
	fs.mkdirSync(CTX_STATE_DIR, { recursive: true });
	fs.writeFileSync(
		STATE_FILE,
		JSON.stringify({
			context: 'master-agent',
			subagent_count: 0,
			last_updated: new Date().toISOString(),
		}),
	);
}

function setupTestDirs(): void {
	fs.mkdirSync(CTX_STATE_DIR, { recursive: true });
}

function cleanupTestDirs(): void {
	fs.rmSync(TEST_BASE, { recursive: true, force: true });
}

describe('Infrastructure: UserPromptSubmit Stale Context Recovery', () => {
	beforeEach(() => {
		cleanupTestDirs();
		setupTestDirs();
	});

	afterEach(() => {
		cleanupTestDirs();
	});

	describe('stale context recovery', () => {
		it('should reset context from subagent to master-agent', () => {
			// Simulate stale state from interrupted Task
			setStaleSubagentContext();
			expect(getContext()).toBe('subagent');

			// Run user-prompt-submit.sh (simulating user typing a prompt)
			const result = runUserPromptSubmit('{"prompt":"test message"}');

			// Hook must never block
			expect(result.exitCode).toBe(0);

			// Context should be reset to master-agent
			expect(getContext()).toBe('master-agent');
		});

		it('should leave master-agent context unchanged', () => {
			// Start in correct state
			setMasterAgentContext();
			expect(getContext()).toBe('master-agent');

			// Run user-prompt-submit.sh
			const result = runUserPromptSubmit('{"prompt":"test message"}');

			// Hook must never block
			expect(result.exitCode).toBe(0);

			// Context should remain master-agent
			expect(getContext()).toBe('master-agent');
		});
	});

	describe('hook never blocks', () => {
		it('should exit 0 even when context-manager scripts fail', () => {
			// Don't create state directory - scripts will fail
			fs.rmSync(CTX_STATE_DIR, { recursive: true, force: true });

			const result = runUserPromptSubmit('{"prompt":"test"}');

			// Must still exit 0 (never block)
			expect(result.exitCode).toBe(0);
		});

		it('should exit 0 with malformed input', () => {
			setMasterAgentContext();

			const result = runUserPromptSubmit('not-valid-json');

			// Must still exit 0
			expect(result.exitCode).toBe(0);
		});
	});
});
