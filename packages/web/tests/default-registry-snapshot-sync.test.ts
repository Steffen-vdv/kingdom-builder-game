import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';

test('default registry metadata snapshot stays in sync', async () => {
	const { buildDefaultRegistrySnapshot } = await import(
		pathToFileURL(
			resolve(
				dirname(fileURLToPath(import.meta.url)),
				'../../../scripts/build-default-registry-snapshot.mjs',
			),
		).href
	);
	const snapshot = await buildDefaultRegistrySnapshot();
	const target = resolve(
		dirname(fileURLToPath(import.meta.url)),
		'../src/contexts/defaultRegistryMetadata.json',
	);
	const contents = await readFile(target, 'utf8');
	const stored = JSON.parse(contents);
	expect(snapshot).toEqual(stored);
});
