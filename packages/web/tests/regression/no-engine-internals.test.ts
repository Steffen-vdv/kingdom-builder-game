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
	it('does not import engine modules directly', async () => {
		const testDir = path.dirname(fileURLToPath(import.meta.url));
		const packageRoot = path.resolve(testDir, '../..');
		const sourceRoots = ['src', 'tests/regression'].map((dir) =>
			path.join(packageRoot, dir),
		);
		const files = (
			await Promise.all(
				sourceRoots.map(async (dir) => {
					try {
						return await collectSourceFiles(dir);
					} catch (error) {
						if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
							return [];
						}
						throw error;
					}
				}),
			)
		).flat();
		const violations: Array<{ file: string; specifier: string }> = [];
		const importPatterns = [
			/(?:import|export)\s[^;]*?\bfrom\s+['"]([^'"\n]+)['"]/g,
			/import\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
			/require\(\s*['"]([^'"\n]+)['"]\s*\)/g,
		];
		const isEngineImport = (specifier: string): boolean =>
			specifier === '@kingdom-builder/engine' ||
			specifier.startsWith('@kingdom-builder/engine/');
		for (const file of files) {
			const contents = await fs.readFile(file, 'utf8');
			for (const pattern of importPatterns) {
				for (const match of contents.matchAll(pattern)) {
					const specifier = match[1];
					if (isEngineImport(specifier)) {
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
