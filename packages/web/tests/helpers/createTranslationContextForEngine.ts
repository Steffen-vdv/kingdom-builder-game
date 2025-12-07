import type {
	SessionMetadataDescriptor,
	SessionResourceCatalog,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createEmptySnapshotMetadata } from './sessionFixtures';

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
			case 'buildings':
			case 'developments':
			case 'stats':
			case 'triggers':
			case 'assets':
			case 'resourceGroups': {
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

function buildAssetMetadata(): Record<string, SessionMetadataDescriptor> {
	const base = createEmptySnapshotMetadata().assets ?? {};
	return { ...base };
}

function buildResourcesMetadata(
	resourceCatalog: SessionResourceCatalog | undefined,
): Record<string, SessionMetadataDescriptor> {
	if (!resourceCatalog) {
		return {};
	}
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const definition of resourceCatalog.resources.ordered) {
		const entry: SessionMetadataDescriptor = {};
		if (definition.label !== undefined) {
			entry.label = definition.label;
		}
		if (definition.icon !== undefined) {
			entry.icon = definition.icon;
		}
		if (definition.description !== undefined) {
			entry.description = definition.description;
		}
		if (definition.displayAsPercent !== undefined) {
			entry.displayAsPercent = definition.displayAsPercent;
		}
		descriptors[definition.id] = entry;
	}
	return descriptors;
}

export function createTranslationContextForEngine(
	engine: Parameters<typeof snapshotEngine>[0],
	configureRegistries?: (registries: SessionRegistries) => void,
	options?: { metadata?: MetadataOverrides },
) {
	const registries = createSessionRegistries();
	configureRegistries?.(registries);
	const snapshot = snapshotEngine(engine);
	const metadataWithRegistries = mergeMetadata(snapshot.metadata, {
		assets: buildAssetMetadata(),
		triggers: snapshot.metadata.triggers ?? {},
		resources: buildResourcesMetadata(snapshot.game.resourceCatalog),
	});
	const metadata = mergeMetadata(metadataWithRegistries, options?.metadata);
	return createTranslationContext(snapshot, registries, metadata, {
		ruleSnapshot: snapshot.rules,
		passiveRecords: snapshot.passiveRecords,
	});
}
