import type { EngineContext } from '@kingdom-builder/engine';
import { TRIGGER_INFO } from '@kingdom-builder/contents';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import type { TranslationContext } from '../../src/translation/context/types';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

export function createTranslationContextForEngine(
	engine: EngineContext,
	configureRegistries?: (registries: SessionRegistries) => void,
) {
	const registries = createSessionRegistries();
	configureRegistries?.(registries);
	const snapshot = snapshotEngine(engine);
	const baseContext = createTranslationContext(
		snapshot,
		registries,
		snapshot.metadata,
		{
			ruleSnapshot: snapshot.rules,
			passiveRecords: snapshot.passiveRecords,
		},
	);
	const assetsWithTriggers = {
		...baseContext.assets,
		triggers: TRIGGER_INFO,
	} as TranslationContext['assets'] & { triggers: typeof TRIGGER_INFO };
	return {
		...baseContext,
		assets: assetsWithTriggers,
	} as TranslationContext & {
		assets: TranslationContext['assets'] & { triggers: typeof TRIGGER_INFO };
	};
}
