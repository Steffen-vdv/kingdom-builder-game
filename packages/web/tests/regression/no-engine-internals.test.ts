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
	it('does not import engine package or internals', async () => {
		const testDir = path.dirname(fileURLToPath(import.meta.url));
		const packageRoot = path.resolve(testDir, '../..');
		const roots = ['src', 'tests'];
		const importFromPattern =
			/(?:import|export)\s[^;]*?from\s+['"]([^'"\n]+)['"]/g;
		const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
		const requirePattern = /\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
		const engineViolations: Array<{ file: string; specifier: string }> = [];
		const contentViolations: Array<{ file: string; specifier: string }> = [];
		const allowedContentImports = new Set<string>();
		for (const rootName of roots) {
			const rootPath = path.join(packageRoot, rootName);
			let stat;
			try {
				stat = await fs.stat(rootPath);
			} catch {
				continue;
			}
			if (!stat.isDirectory()) {
				continue;
			}
			const files = await collectSourceFiles(rootPath);
			for (const file of files) {
				const contents = await fs.readFile(file, 'utf8');
				const matches = [
					...contents.matchAll(importFromPattern),
					...contents.matchAll(dynamicImportPattern),
					...contents.matchAll(requirePattern),
				];
				for (const match of matches) {
					const specifier = match[1];
					const relativeFile = path.relative(packageRoot, file);
					if (specifier.startsWith('@kingdom-builder/engine/')) {
						engineViolations.push({
							file: relativeFile,
							specifier,
						});
					}
					if (
						rootName === 'src' &&
						specifier.startsWith('@kingdom-builder/contents') &&
						!allowedContentImports.has(relativeFile)
					) {
						contentViolations.push({
							file: relativeFile,
							specifier,
						});
					}
				}
			}
		}
		expect(engineViolations).toEqual([]);
		expect(contentViolations).toEqual([]);
	});
});
