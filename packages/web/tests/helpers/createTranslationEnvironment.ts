import type { EngineContext } from '@kingdom-builder/engine';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTestRegistryMetadata } from './registryMetadata';

export function createTranslationEnvironmentFromEngine(
	engine: EngineContext,
	registries: SessionRegistries,
) {
	const snapshot = snapshotEngine(engine);
	const translationContext = createTranslationContext(
		snapshot,
		registries,
		snapshot.metadata,
		{
			ruleSnapshot: snapshot.rules,
			passiveRecords: snapshot.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		{
			resources: registries.resources,
			populations: registries.populations,
			buildings: registries.buildings,
			developments: registries.developments,
		},
		snapshot.metadata,
	);
	return { translationContext, metadataSelectors, snapshot };
}
