import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function collectSourceFiles(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (entry.name.startsWith('.')) {
			continue;
		}
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectSourceFiles(fullPath)));
			continue;
		}
		if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) {
			files.push(fullPath);
		}
	}
	return files;
}

describe('web package avoids engine internals', () => {
	it('does not import engine internals anywhere', async () => {
		const testDir = path.dirname(fileURLToPath(import.meta.url));
		const packageRoot = path.resolve(testDir, '../..');
		const roots = ['src', 'tests'];
		const importPattern = /(?:import|export)\s[^;]*?from\s+['"]([^'"\n]+)['"]/g;
		const violations: Array<{ file: string; specifier: string }> = [];
		for (const rootName of roots) {
			const rootDir = path.join(packageRoot, rootName);
			const stats = await fs.stat(rootDir).catch(() => undefined);
			if (!stats?.isDirectory()) {
				continue;
			}
			const files = await collectSourceFiles(rootDir);
			for (const file of files) {
				const contents = await fs.readFile(file, 'utf8');
				for (const match of contents.matchAll(importPattern)) {
					const specifier = match[1];
					if (
						specifier === '@kingdom-builder/engine' ||
						specifier.startsWith('@kingdom-builder/engine/')
					) {
						violations.push({
							file: path.relative(packageRoot, file),
							specifier,
						});
					}
				}
			}
		}
		expect(violations).toEqual([]);
	});
});
