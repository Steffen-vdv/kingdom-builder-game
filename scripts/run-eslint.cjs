#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const eslintBin = path.join(
	__dirname,
	'..',
	'node_modules',
	'eslint',
	'bin',
	'eslint.js',
);
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [eslintBin, ...args], {
	stdio: 'inherit',
	env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' },
	cwd: process.cwd(),
});

if (typeof result.status === 'number') {
	process.exit(result.status);
}

process.exitCode = 1;
