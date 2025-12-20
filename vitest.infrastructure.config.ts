import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Infrastructure test configuration
 *
 * These tests verify agent infrastructure (hooks, scripts, paths).
 * Located in .claude/tests/ (separate from game code tests).
 *
 * Requirements:
 * - Python 3 with bashlex installed
 * - crypto-gate binary in bin/
 * - CLAUDE_PROJECT_DIR environment variable
 *
 * Run locally: pnpm test:infrastructure
 * Run in CI: Separate job with Python/bashlex setup
 */
export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			root: path.resolve(__dirname, '.claude/tests'),
			include: ['infrastructure/**/*.test.ts'],
			exclude: ['**/node_modules/**'],
			// Longer timeout for infrastructure tests (shell scripts, crypto ops)
			testTimeout: 30000,
		},
	}),
);
