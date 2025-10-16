#!/usr/bin/env node
import process from 'node:process';

const args = process.argv.slice(2);

if (args.includes('--version')) {
	console.log('CodeRabbit CLI mock 0.0.0');
	process.exit(0);
}

if (args.length === 0) {
	console.log('CodeRabbit CLI mock executed with no arguments.');
	process.exit(0);
}

if (args[0] === 'auth') {
	console.log('CodeRabbit CLI mock auth flow skipped.');
	process.exit(0);
}

if (args[0] === 'review') {
	console.log('CodeRabbit CLI mock review skipped.');
	process.exit(0);
}

console.log(`CodeRabbit CLI mock executed: ${args.join(' ')}`);
