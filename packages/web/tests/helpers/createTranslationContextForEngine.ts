import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

type MetadataOverrides = Partial<SessionSnapshotMetadata>;

function mergeMetadata(
	base: SessionSnapshotMetadata,
	overrides: MetadataOverrides | undefined,
): SessionSnapshotMetadata {
	if (!overrides) {
		return base;
	}
	const merged: SessionSnapshotMetadata = { ...base };
	for (const [key, value] of Object.entries(overrides)) {
		if (value === undefined) {
			continue;
		}
		switch (key) {
			case 'resources':
			case 'populations':
			case 'buildings':
			case 'developments':
			case 'stats':
			case 'triggers':
			case 'assets': {
				const typedKey = key as keyof SessionSnapshotMetadata;
				const current = (merged[typedKey] ?? {}) as Record<string, unknown>;
				merged[typedKey] = {
					...current,
					...(value as Record<string, unknown>),
				} as never;
				break;
			}
			default: {
				(merged as Record<string, unknown>)[key] = value;
			}
		}
	}
	return merged;
}

export function createTranslationContextForEngine(
	engine: Parameters<typeof snapshotEngine>[0],
	configureRegistries?: (registries: SessionRegistries) => void,
	options?: { metadata?: MetadataOverrides },
) {
	const registries = createSessionRegistries();
	configureRegistries?.(registries);
	const snapshot = snapshotEngine(engine);
	const metadata = mergeMetadata(snapshot.metadata, options?.metadata);
	return createTranslationContext(snapshot, registries, metadata, {
		ruleSnapshot: snapshot.rules,
		passiveRecords: snapshot.passiveRecords,
	});
}
