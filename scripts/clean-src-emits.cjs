#!/usr/bin/env node
// Removes generated `.js` and `.d.ts` files that TypeScript may emit into
// `packages/*/src/` directories. Used as a cross-platform safety net for
// `posttypecheck`. The Linux/macOS `find … -delete` invocation it replaces
// silently no-ops on Windows, leaving stale compiled output that vite then
// prefers over the fresh `.tsx` source — see CLAUDE.md notes on this trap.
const fs = require('node:fs');
const path = require('node:path');

const packagesDir = path.resolve(__dirname, '..', 'packages');

if (!fs.existsSync(packagesDir)) {
	process.exit(0);
}

for (const entry of fs.readdirSync(packagesDir)) {
	const srcPath = path.join(packagesDir, entry, 'src');
	if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
		removeGeneratedSources(srcPath);
	}
}

function removeGeneratedSources(directory) {
	for (const name of fs.readdirSync(directory)) {
		const filePath = path.join(directory, name);
		const stats = fs.lstatSync(filePath);

		if (stats.isDirectory()) {
			removeGeneratedSources(filePath);
			continue;
		}

		if (
			stats.isFile() &&
			(filePath.endsWith('.js') || filePath.endsWith('.d.ts'))
		) {
			fs.rmSync(filePath);
		}
	}
}
