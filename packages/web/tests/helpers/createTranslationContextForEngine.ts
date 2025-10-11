import type { EngineContext } from '@kingdom-builder/engine';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';

export function createTranslationContextForEngine(engine: EngineContext) {
	const registries = createSessionRegistries();
	const snapshot = snapshotEngine(engine);
	return createTranslationContext(snapshot, registries, snapshot.metadata, {
		ruleSnapshot: snapshot.rules,
		passiveRecords: snapshot.passiveRecords,
	});
}
