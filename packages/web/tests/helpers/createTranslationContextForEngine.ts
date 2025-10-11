import type { EngineContext } from '@kingdom-builder/engine';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

export function createTranslationContextForEngine(
	engine: EngineContext,
	configureRegistries?: (registries: SessionRegistries) => void,
) {
	const registries = createSessionRegistries();
	configureRegistries?.(registries);
	const snapshot = snapshotEngine(engine);
	return createTranslationContext(snapshot, registries, snapshot.metadata, {
		ruleSnapshot: snapshot.rules,
		passiveRecords: snapshot.passiveRecords,
	});
}
