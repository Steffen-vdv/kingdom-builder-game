import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Infrastructure Test: command/ package
 *
 * Tests the shell command parsing library used by hooks to parse commands
 * into structured components. The library uses a registry pattern with
 * specialized specs for different executables (e.g., git).
 *
 * Key features tested:
 * - Executable and subcommand extraction
 * - Flag parsing (short/long, with/without values)
 * - Positional argument identification
 * - Path extraction
 * - Git-specific parsing using git's own -h output
 * - Unsupported command fallback behavior
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, '.claude/agents/shared/scripts');

describe('Infrastructure: command/ package', () => {
	const parseCommand = (command: string): Record<string, unknown> => {
		// Use base64 encoding to avoid shell escaping issues with quotes
		const b64 = Buffer.from(command).toString('base64');
		const result = execSync(
			`PYTHONPATH="${SCRIPTS_DIR}" python3 -c "
import base64, json, sys
from command import parse_command
from command.specs.git import _get_git_options
_get_git_options.cache_clear()
cmd = base64.b64decode('${b64}').decode('utf-8')
print(json.dumps(parse_command(cmd)))
"`,
			{
				encoding: 'utf-8',
				cwd: PROJECT_ROOT,
			},
		);
		return JSON.parse(result);
	};

	describe('Basic Structure', () => {
		it('should return all required fields', () => {
			const result = parseCommand('ls -la');
			expect(result).toHaveProperty('supported');
			expect(result).toHaveProperty('executable');
			expect(result).toHaveProperty('args');
			expect(result).toHaveProperty('flags');
			expect(result).toHaveProperty('positional');
			expect(result).toHaveProperty('paths');
			expect(result).toHaveProperty('raw');
		});

		it('should preserve raw command', () => {
			const cmd = 'git status --short';
			const result = parseCommand(cmd);
			expect(result.raw).toBe(cmd);
		});
	});

	describe('Executable Extraction', () => {
		it('should extract simple executable', () => {
			const result = parseCommand('ls -la');
			expect(result.executable).toBe('ls');
		});

		it('should extract executable with absolute path', () => {
			const result = parseCommand('/usr/bin/ls -la');
			expect(result.executable).toBe('/usr/bin/ls');
		});

		it('should extract executable with relative path', () => {
			const result = parseCommand('./script.sh arg1');
			expect(result.executable).toBe('./script.sh');
		});

		it('should extract git as executable', () => {
			const result = parseCommand('git commit --amend');
			expect(result.executable).toBe('git');
		});

		it('should handle empty command', () => {
			const result = parseCommand('');
			expect(result.executable).toBe('');
			expect(result.args).toEqual([]);
		});
	});

	describe('Git Subcommand Detection', () => {
		it('should extract git subcommand', () => {
			const result = parseCommand('git commit -m "msg"');
			expect(result.subcommand).toBe('commit');
		});

		it('should mark git commands as supported', () => {
			const result = parseCommand('git commit --amend');
			expect(result.supported).toBe(true);
		});

		it('should handle git without subcommand', () => {
			const result = parseCommand('git');
			expect(result.subcommand).toBeNull();
		});
	});

	describe('Git Flag Parsing (using git -h)', () => {
		it('should parse --amend as boolean', () => {
			const result = parseCommand('git commit --amend');
			expect(result.flags).toHaveProperty('amend', true);
		});

		it('should parse -m with value', () => {
			const result = parseCommand('git commit -m "fix bug"');
			expect(result.flags).toHaveProperty('m', 'fix bug');
		});

		it('should parse --message with value', () => {
			const result = parseCommand('git commit --message "fix bug"');
			expect(result.flags).toHaveProperty('message', 'fix bug');
		});

		it('should parse --flag=value format', () => {
			const result = parseCommand('git commit --message="fix bug"');
			expect(result.flags).toHaveProperty('message', 'fix bug');
		});

		it('should parse multiple flags together', () => {
			const result = parseCommand('git commit --amend -m "fix"');
			expect(result.flags).toHaveProperty('amend', true);
			expect(result.flags).toHaveProperty('m', 'fix');
		});

		it('should parse -i for rebase as boolean', () => {
			const result = parseCommand('git rebase -i HEAD~3');
			expect(result.flags).toHaveProperty('i', true);
			expect(result.positional).toContain('HEAD~3');
		});

		it('should parse --interactive for rebase', () => {
			const result = parseCommand('git rebase --interactive HEAD~3');
			expect(result.flags).toHaveProperty('interactive', true);
		});

		it('should parse -b for checkout as boolean', () => {
			const result = parseCommand('git checkout -b feature-branch');
			expect(result.flags).toHaveProperty('b', true);
			expect(result.positional).toContain('feature-branch');
		});

		it('should parse --hard for reset', () => {
			const result = parseCommand('git reset --hard HEAD~1');
			expect(result.flags).toHaveProperty('hard', true);
		});

		it('should handle -- separator', () => {
			const result = parseCommand('git checkout -- file.txt');
			expect(result.positional).toContain('file.txt');
		});
	});

	describe('Unsupported Commands (Generic Parsing)', () => {
		it('should mark non-git commands as unsupported', () => {
			const result = parseCommand('rm -rf /tmp/test');
			expect(result.supported).toBe(false);
		});

		it('should return flags as array for unsupported commands', () => {
			const result = parseCommand('rm -rf /tmp/test');
			expect(Array.isArray(result.flags)).toBe(true);
			expect(result.flags).toContain('-rf');
		});

		it('should extract positional args for unsupported commands', () => {
			const result = parseCommand('cp source.txt dest.txt');
			expect(result.positional).toContain('source.txt');
			expect(result.positional).toContain('dest.txt');
		});
	});

	describe('Path Extraction', () => {
		it('should extract absolute paths', () => {
			const result = parseCommand('rm /path/to/file.sh');
			expect(result.paths).toContain('/path/to/file.sh');
		});

		it('should extract relative paths with ./', () => {
			const result = parseCommand('cat ./config/settings.json');
			expect(result.paths).toContain('./config/settings.json');
		});

		it('should extract paths containing /', () => {
			const result = parseCommand('rm .claude/hooks/pre-push.sh');
			expect(result.paths).toContain('.claude/hooks/pre-push.sh');
		});

		it('should extract multiple paths', () => {
			const result = parseCommand('cp /a/b.txt /c/d.txt');
			expect(result.paths).toContain('/a/b.txt');
			expect(result.paths).toContain('/c/d.txt');
		});
	});

	describe('Quoted Strings', () => {
		it('should handle double-quoted strings with spaces', () => {
			const result = parseCommand('git commit -m "fix: handle edge case"');
			expect(result.flags).toHaveProperty('m', 'fix: handle edge case');
		});

		it('should handle single-quoted strings', () => {
			const result = parseCommand("git commit -m 'fix bug'");
			expect(result.flags).toHaveProperty('m', 'fix bug');
		});

		it('should handle quotes in positional args', () => {
			const result = parseCommand('echo "hello world"');
			expect(result.positional).toContain('hello world');
		});
	});

	describe('Edge Cases', () => {
		it('should handle command with only executable', () => {
			const result = parseCommand('ls');
			expect(result.executable).toBe('ls');
			expect(result.args).toEqual([]);
		});

		it('should handle git status (common case)', () => {
			const result = parseCommand('git status');
			expect(result.executable).toBe('git');
			expect(result.subcommand).toBe('status');
			expect(result.supported).toBe(true);
		});

		it('should handle git diff with paths', () => {
			const result = parseCommand('git diff HEAD~2 -- src/file.ts');
			expect(result.positional).toContain('HEAD~2');
			expect(result.positional).toContain('src/file.ts');
		});
	});

	describe('Known Limitations (documented)', () => {
		// These tests document known limitations of the git parser.
		// See git.py KNOWN LIMITATIONS section.

		it('LIMITATION: git log -n treated as boolean (inherited flag)', () => {
			// -n is inherited from git-rev-list, not in git log -h
			const result = parseCommand('git log -n 5');
			// Known limitation: -n is boolean, 5 goes to positional
			expect(result.flags).toHaveProperty('n', true);
			expect(result.positional).toContain('5');
		});
	});

	describe('Hook Enforcement Scenarios', () => {
		// These are the primary use cases for the parser in hooks

		it('should detect git commit --amend', () => {
			const result = parseCommand('git commit --amend');
			expect(result.executable).toBe('git');
			expect(result.subcommand).toBe('commit');
			expect(result.flags).toHaveProperty('amend', true);
		});

		it('should detect git rebase -i', () => {
			const result = parseCommand('git rebase -i HEAD~3');
			expect(result.executable).toBe('git');
			expect(result.subcommand).toBe('rebase');
			expect(result.flags).toHaveProperty('i', true);
		});

		it('should detect git reset --hard', () => {
			const result = parseCommand('git reset --hard HEAD~1');
			expect(result.executable).toBe('git');
			expect(result.subcommand).toBe('reset');
			expect(result.flags).toHaveProperty('hard', true);
		});

		it('should detect rm targeting .claude/hooks', () => {
			const result = parseCommand('rm .claude/hooks/some-hook.sh');
			expect(result.executable).toBe('rm');
			expect(result.paths).toContain('.claude/hooks/some-hook.sh');
		});

		it('should detect rm -rf targeting .claude', () => {
			const result = parseCommand('rm -rf .claude/');
			expect(result.executable).toBe('rm');
			expect(result.paths).toContain('.claude/');
		});
	});

	describe('jq Integration (query replacement)', () => {
		// Since --query mode was removed, verify jq can extract needed values

		const parseAndQuery = (command: string, jqFilter: string): string => {
			const b64 = Buffer.from(command).toString('base64');
			return execSync(
				`PYTHONPATH="${SCRIPTS_DIR}" python3 -c "
import base64, json
from command import parse_command
from command.specs.git import _get_git_options
_get_git_options.cache_clear()
cmd = base64.b64decode('${b64}').decode('utf-8')
print(json.dumps(parse_command(cmd)))
" | jq -r '${jqFilter}'`,
				{
					encoding: 'utf-8',
					cwd: PROJECT_ROOT,
				},
			).trim();
		};

		it('should extract executable with jq', () => {
			expect(parseAndQuery('git commit', '.executable')).toBe('git');
		});

		it('should check flag presence with jq', () => {
			expect(parseAndQuery('git commit --amend', '.flags.amend')).toBe('true');
		});

		it('should get flag value with jq', () => {
			expect(parseAndQuery('git commit -m "fix"', '.flags.m')).toBe('fix');
		});

		it('should check path contains pattern with jq', () => {
			const result = parseAndQuery(
				'rm .claude/hooks/file.sh',
				'.paths | any(contains(".claude/hooks"))',
			);
			expect(result).toBe('true');
		});
	});
});
