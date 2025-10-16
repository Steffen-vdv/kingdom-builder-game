import type { EngineContext } from '@kingdom-builder/engine';
import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

type ConfigureRegistriesFn = (registries: SessionRegistries) => void;

type TranslationContextFactoryOptions = {
	configureRegistries?: ConfigureRegistriesFn;
	configureSnapshot?: (snapshot: SessionSnapshot) => void;
	configureMetadata?: (
		metadata: SessionSnapshotMetadata,
	) => SessionSnapshotMetadata;
};

function clone<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
}

export function createTranslationContextForEngine(
	engine: EngineContext,
	configureOrOptions?: ConfigureRegistriesFn | TranslationContextFactoryOptions,
) {
	const registries = createSessionRegistries();
	const configureRegistries =
		typeof configureOrOptions === 'function'
			? configureOrOptions
			: configureOrOptions?.configureRegistries;
	configureRegistries?.(registries);
	const snapshot = snapshotEngine(engine);
	if (typeof configureOrOptions === 'object') {
		configureOrOptions.configureSnapshot?.(snapshot);
	}
	const metadata = (() => {
		if (
			typeof configureOrOptions === 'object' &&
			configureOrOptions.configureMetadata
		) {
			return configureOrOptions.configureMetadata(clone(snapshot.metadata));
		}
		return snapshot.metadata;
	})();
	return createTranslationContext(snapshot, registries, metadata, {
		ruleSnapshot: snapshot.rules,
		passiveRecords: snapshot.passiveRecords,
	});
}
