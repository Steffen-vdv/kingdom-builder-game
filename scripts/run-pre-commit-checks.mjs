#!/usr/bin/env node

import { spawnSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const cacheDir = path.join(repoRoot, '.git');
const cacheFile = path.join(cacheDir, 'kb-pre-commit-cache.json');

const runGit = (args) =>
	execSync(`git ${args}`, {
		cwd: repoRoot,
		encoding: 'utf8',
	}).trim();

const loadCache = () => {
	if (!existsSync(cacheFile)) {
		return { verifiedTrees: [] };
	}

	try {
		const raw = readFileSync(cacheFile, 'utf8');
		const parsed = JSON.parse(raw);

		if (!Array.isArray(parsed.verifiedTrees)) {
			return { verifiedTrees: [] };
		}

		return {
			verifiedTrees: parsed.verifiedTrees.filter(
				(item) => typeof item === 'string' && item.length > 0,
			),
		};
	} catch (error) {
		console.warn('⚠️  Unable to read Husky cache. Continuing without it.');
		return { verifiedTrees: [] };
	}
};

const saveCache = (cache, tree) => {
	const updated = [...cache.verifiedTrees, tree];
	const deduped = Array.from(new Set(updated));
	const limited = deduped.slice(-20);

	if (!existsSync(cacheDir)) {
		mkdirSync(cacheDir, { recursive: true });
	}

	writeFileSync(
		cacheFile,
		JSON.stringify({ verifiedTrees: limited }, null, 2),
		'utf8',
	);
};

const runCommand = (command, args) => {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		stdio: 'inherit',
		env: process.env,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
};

const resolveTreeHash = () => {
	try {
		return runGit('write-tree');
	} catch (error) {
		console.warn(
			'⚠️  Unable to compute staged tree hash. Running full checks.',
		);
		return null;
	}
};

const stagedTree = resolveTreeHash();
const cache = loadCache();

if (stagedTree && cache.verifiedTrees.includes(stagedTree)) {
	console.log('✅ Staged content already verified. Skipping redundant checks.');
	process.exit(0);
}

runCommand('npm', ['run', 'check']);
runCommand('npm', ['run', 'test:quick']);

const refreshedTree = resolveTreeHash();

if (refreshedTree) {
	saveCache(cache, refreshedTree);
	console.log(
		`✅ Cached verification for staged tree ${refreshedTree.slice(0, 12)}...`,
	);
}

process.exit(0);
