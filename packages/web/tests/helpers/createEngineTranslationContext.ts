import { createEngine } from '../../../engine/src';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createSessionRegistries } from './sessionRegistries';
import { createTestRegistryMetadata } from './registryMetadata';

interface EngineTranslationContextOptions {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	registries?: SessionRegistries;
	configureMetadata?: (
		metadata: SessionSnapshotMetadata,
	) => SessionSnapshotMetadata;
}

function cloneMetadata(
	metadata: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	if (typeof structuredClone === 'function') {
		return structuredClone(metadata);
	}
	return JSON.parse(JSON.stringify(metadata)) as SessionSnapshotMetadata;
}

export function createEngineTranslationContext({
	phases,
	start,
	rules,
	registries: providedRegistries,
	configureMetadata,
}: EngineTranslationContextOptions) {
	const registries = providedRegistries ?? createSessionRegistries();
	const engineContext = createEngine({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases,
		start,
		rules,
	});
	const snapshot = snapshotEngine(engineContext);
	const baseMetadata = cloneMetadata(snapshot.metadata);
	const metadata = configureMetadata
		? configureMetadata(baseMetadata)
		: baseMetadata;
	const sessionSnapshot = {
		...snapshot,
		metadata,
	};
	const translationContext = createTranslationContext(
		sessionSnapshot,
		registries,
		metadata,
		{
			ruleSnapshot: sessionSnapshot.rules,
			passiveRecords: sessionSnapshot.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(registries, metadata);
	return {
		engineContext,
		registries,
		translationContext,
		metadata,
		metadataSelectors,
		snapshot: sessionSnapshot,
	};
}
