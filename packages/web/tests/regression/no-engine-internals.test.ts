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
	it('does not import deep engine paths', async () => {
		const testDir = path.dirname(fileURLToPath(import.meta.url));
		const root = path.resolve(testDir, '../../src');
		const files = await collectSourceFiles(root);
		const violations: Array<{ file: string; specifier: string }> = [];
		const importPattern = /(?:import|export)\s[^;]*?from\s+['"]([^'"\n]+)['"]/g;
		for (const file of files) {
			const contents = await fs.readFile(file, 'utf8');
			for (const match of contents.matchAll(importPattern)) {
				const specifier = match[1];
				if (specifier.startsWith('@kingdom-builder/engine/')) {
					violations.push({ file: path.relative(root, file), specifier });
				}
			}
		}
		expect(violations).toEqual([]);
	});
});
