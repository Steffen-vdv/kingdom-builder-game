import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Infrastructure Test: run-with-auth.mjs
 *
 * Verifies that the server startup script:
 * - Uses pnpm (not npm) to spawn child processes
 * - Produces no warnings about unknown config options
 * - Correctly inherits pnpm environment without leaking to npm
 *
 * This test prevents regressions like using npm instead of pnpm,
 * which causes warnings about pnpm-specific config options.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts/run-with-auth.mjs');

/**
 * Helper to run a command and capture stdout/stderr separately
 */
function runCommand(
	command: string,
	args: string[],
	options: { timeout?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<{ stdout: string; stderr: string; code: number | null }> {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: PROJECT_ROOT,
			env: { ...process.env, ...options.env },
			shell: process.platform === 'win32',
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		child.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		const timeout = options.timeout ?? 30000;
		const timer = setTimeout(() => {
			child.kill('SIGTERM');
		}, timeout);

		child.on('close', (code) => {
			clearTimeout(timer);
			resolve({ stdout, stderr, code });
		});

		child.on('error', () => {
			clearTimeout(timer);
			resolve({ stdout, stderr, code: 1 });
		});
	});
}

describe('Infrastructure: run-with-auth.mjs', () => {
	it('should exist and be readable', () => {
		expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
	});

	describe('Package manager usage', () => {
		it('should use pnpm instead of npm in spawn call', () => {
			const content = fs.readFileSync(SCRIPT_PATH, 'utf-8');

			// The script should spawn 'pnpm', not 'npm'
			expect(content).toContain("spawn('pnpm'");
			expect(content).not.toMatch(/spawn\s*\(\s*['"]npm['"]/);
		});

		it('should reference pnpm in error messages', () => {
			const content = fs.readFileSync(SCRIPT_PATH, 'utf-8');

			// Error messages should mention pnpm
			expect(content).toContain('Failed to start pnpm');
			expect(content).not.toContain('Failed to start npm');
		});
	});

	describe('No npm warnings on execution', () => {
		it('should produce no npm warnings when running a script', async () => {
			// Run with a non-existent script to get a quick failure
			// This tests that the spawn itself doesn't produce npm warnings
			const result = await runCommand('node', [SCRIPT_PATH, 'nonexistent'], {
				timeout: 15000,
			});

			// Check stderr for npm warnings
			const npmWarnings = result.stderr
				.split('\n')
				.filter((line) => line.includes('npm warn'));

			expect(npmWarnings).toHaveLength(0);

			// The error should come from pnpm, not npm
			if (result.stderr.includes('Unknown script')) {
				// pnpm error format
				expect(result.stderr).not.toContain('npm ERR!');
			}
		});

		it('should not leak pnpm config to npm subprocess', async () => {
			// These are pnpm-specific configs that would cause npm warnings
			const pnpmConfigs = [
				'enable-pre-post-scripts',
				'verify-deps-before-run',
				'_jsr-registry',
			];

			const result = await runCommand('node', [SCRIPT_PATH, 'nonexistent'], {
				timeout: 15000,
			});

			// None of these should appear as "Unknown env config" warnings
			for (const config of pnpmConfigs) {
				expect(result.stderr).not.toContain(`Unknown env config "${config}"`);
				expect(result.stderr).not.toContain(
					`Unknown project config "${config}"`,
				);
			}
		});
	});

	describe('Script argument handling', () => {
		it('should show usage when no script name provided', async () => {
			const result = await runCommand('node', [SCRIPT_PATH], {
				timeout: 10000,
			});

			expect(result.code).not.toBe(0);
			expect(result.stderr).toContain('Usage:');
		});
	});
});
