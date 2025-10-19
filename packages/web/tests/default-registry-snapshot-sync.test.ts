import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';
import type { Registry } from '@kingdom-builder/protocol';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import { clone } from '../src/state/clone';
import { getContentRegistrySnapshot } from '../src/contexts/contentRegistrySnapshot';

const serializeRegistry = <TDefinition extends { id: string }>(
	registry: Registry<TDefinition>,
) =>
	Object.fromEntries(
		Array.from(registry.entries()).map(([id, definition]) => [
			id,
			clone(definition),
		]),
	);

const serializeRegistries = (registries: SessionRegistries) => ({
	actions: serializeRegistry(registries.actions),
	buildings: serializeRegistry(registries.buildings),
	developments: serializeRegistry(registries.developments),
	populations: serializeRegistry(registries.populations),
	resources: { ...registries.resources },
});

test('content registry snapshot matches build script output', async () => {
	const { buildDefaultRegistrySnapshot } = await import(
		pathToFileURL(
			resolve(
				dirname(fileURLToPath(import.meta.url)),
				'../../../scripts/build-default-registry-snapshot.mjs',
			),
		).href
	);
	const runtimeSnapshot = getContentRegistrySnapshot();
	const scriptSnapshot = await buildDefaultRegistrySnapshot();
	expect(serializeRegistries(runtimeSnapshot.registries)).toEqual(
		scriptSnapshot.registries,
	);
	expect(runtimeSnapshot.metadata).toEqual(scriptSnapshot.metadata);
});
