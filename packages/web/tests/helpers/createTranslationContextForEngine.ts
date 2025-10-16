import type { EngineContext } from '@kingdom-builder/engine';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

type MetadataOverrides = Partial<SessionSnapshotMetadata>;

/**
 * Produce a SessionSnapshotMetadata by applying `overrides` onto `base`, merging specific nested maps and overwriting other fields.
 *
 * @param base - The original session snapshot metadata to serve as the base.
 * @param overrides - Partial metadata whose defined entries are applied to `base`. For the keys `resources`, `populations`, `buildings`, `developments`, `stats`, `triggers`, and `assets`, a shallow merge is performed with existing maps; other keys are replaced. If `overrides` is `undefined`, `base` is returned unchanged.
 * @returns The resulting SessionSnapshotMetadata after applying the overrides.
 */
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

/**
 * Build a translation context from an engine context, with optional registry configuration and metadata overrides.
 *
 * @param engine - The engine context to take a snapshot from.
 * @param configureRegistries - Optional callback to customize the newly created session registries before creating the context.
 * @param options - Optional settings.
 * @param options.metadata - Partial metadata to merge into the snapshot's metadata; provided keys overwrite or shallow-merge into corresponding metadata fields.
 * @returns The translation context constructed from the engine snapshot, configured registries, and merged metadata.
 */
export function createTranslationContextForEngine(
	engine: EngineContext,
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