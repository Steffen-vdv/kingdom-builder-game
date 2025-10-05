#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const packagesDir = path.resolve(__dirname, '..', 'packages');

for (const entry of fs.readdirSync(packagesDir)) {
	const packageDir = path.join(packagesDir, entry);
	const distPath = path.join(packageDir, 'dist');
	const buildInfoPath = path.join(packageDir, 'tsconfig.tsbuildinfo');

	if (fs.existsSync(distPath)) {
		fs.rmSync(distPath, { recursive: true, force: true });
	}

	if (fs.existsSync(buildInfoPath)) {
		fs.rmSync(buildInfoPath, { force: true });
	}

	const srcPath = path.join(packageDir, 'src');
	if (fs.existsSync(srcPath)) {
		removeGeneratedSources(srcPath);
	}
}

const rootBuildInfo = path.resolve(__dirname, '..', 'tsconfig.tsbuildinfo');

if (fs.existsSync(rootBuildInfo)) {
	fs.rmSync(rootBuildInfo, { force: true });
}

function removeGeneratedSources(directory) {
	for (const name of fs.readdirSync(directory)) {
		const filePath = path.join(directory, name);
		const stats = fs.lstatSync(filePath);

		if (stats.isDirectory()) {
			removeGeneratedSources(filePath);
		} else if (
			stats.isFile() &&
			(filePath.endsWith('.js') || filePath.endsWith('.d.ts'))
		) {
			fs.rmSync(filePath);
		}
	}
}
