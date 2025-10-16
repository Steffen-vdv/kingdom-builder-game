import type { EngineContext } from '@kingdom-builder/engine';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

function cloneMetadata(
	metadata: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	if (typeof structuredClone === 'function') {
		return structuredClone(metadata);
	}
	return JSON.parse(JSON.stringify(metadata)) as SessionSnapshotMetadata;
}

export function createTranslationContextForEngine(
	engine: EngineContext,
	configureRegistries?: (registries: SessionRegistries) => void,
	transformMetadata?: (
		metadata: SessionSnapshotMetadata,
	) => SessionSnapshotMetadata,
) {
	const registries = createSessionRegistries();
	configureRegistries?.(registries);
	const snapshot = snapshotEngine(engine);
	const baseMetadata = cloneMetadata(snapshot.metadata);
	const metadata = transformMetadata
		? transformMetadata(baseMetadata)
		: baseMetadata;
	const sessionSnapshot = {
		...snapshot,
		metadata,
	};
	return createTranslationContext(sessionSnapshot, registries, metadata, {
		ruleSnapshot: sessionSnapshot.rules,
		passiveRecords: sessionSnapshot.passiveRecords,
	});
}
