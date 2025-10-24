import type {
	SessionMetadataDescriptor,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createEmptySnapshotMetadata } from './sessionFixtures';
import { createStatMetadata, humanizeId } from './actionsPanel/statMetadata';

const REQUIRED_STAT_DESCRIPTORS: Record<string, SessionMetadataDescriptor> =
	Object.freeze({
		maxPopulation: {
			icon: '👥',
			label: 'Max Population',
			description:
				'Max Population determines how many subjects your kingdom can sustain. Expand infrastructure or build houses to increase it.',
			format: { prefix: 'Max ' },
		},
		armyStrength: {
			icon: '⚔️',
			label: 'Army Strength',
			description:
				'Army Strength reflects the overall power of your military forces. A higher value makes your attacks more formidable.',
		},
		fortificationStrength: {
			icon: '🛡️',
			label: 'Fortification Strength',
			description:
				'Fortification Strength measures the resilience of your defenses. It reduces damage taken when enemies assault your castle.',
		},
		growth: {
			icon: '📈',
			label: 'Growth',
			description:
				'Growth increases Army and Fortification Strength during the Raise Strength step. Its effect scales with active Legions and Fortifiers—if you lack Legions or Fortifiers, that side will not gain Strength during the Growth phase.',
			displayAsPercent: true,
			format: { percent: true },
		},
		warWeariness: {
			icon: '💤',
			label: 'War Weariness',
			description:
				'War Weariness reflects the fatigue from prolonged conflict. High weariness can sap morale and hinder wartime efforts.',
		},
	});

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

function buildResourceMetadata(
	registries: SessionRegistries,
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, definition] of Object.entries(registries.resources)) {
		const entry: SessionMetadataDescriptor = {};
		if (definition.icon !== undefined) {
			entry.icon = definition.icon;
		}
		if (definition.label !== undefined) {
			entry.label = definition.label;
		}
		if (definition.description !== undefined) {
			entry.description = definition.description;
		}
		descriptors[key] = entry;
	}
	return descriptors;
}

function buildPopulationMetadata(
	registries: SessionRegistries,
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of registries.populations.entries()) {
		const entry: SessionMetadataDescriptor = {};
		if (definition.icon !== undefined) {
			entry.icon = definition.icon;
		}
		if (definition.name !== undefined) {
			entry.label = definition.name;
		}
		if (definition.description !== undefined) {
			entry.description = definition.description;
		}
		descriptors[id] = entry;
	}
	return descriptors;
}

function buildAssetMetadata(): Record<string, SessionMetadataDescriptor> {
	const base = createEmptySnapshotMetadata().assets ?? {};
	return { ...base };
}

function buildStatMetadata(
	registries: SessionRegistries,
): Record<string, SessionMetadataDescriptor> {
	const { entries } = createStatMetadata(registries, 'maxPopulation');
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, descriptor] of entries) {
		const fallback = REQUIRED_STAT_DESCRIPTORS[id];
		if (fallback) {
			descriptors[id] = { ...fallback };
			continue;
		}
		const label = descriptor.label ?? humanizeId(id);
		const description = descriptor.description ?? `${label} descriptor`;
		const entry: SessionMetadataDescriptor = { label, description };
		if (descriptor.icon !== undefined) {
			entry.icon = descriptor.icon;
		}
		if (descriptor.format !== undefined) {
			entry.format = descriptor.format;
		}
		if (descriptor.displayAsPercent === true) {
			entry.displayAsPercent = true;
		}
		descriptors[id] = entry;
	}
	for (const [id, fallback] of Object.entries(REQUIRED_STAT_DESCRIPTORS)) {
		if (!descriptors[id]) {
			descriptors[id] = { ...fallback };
		}
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
		resources: buildResourceMetadata(registries),
		populations: buildPopulationMetadata(registries),
		assets: buildAssetMetadata(),
		stats: buildStatMetadata(registries),
		triggers: snapshot.metadata.triggers ?? {},
	});
	const metadata = mergeMetadata(metadataWithRegistries, options?.metadata);
	return createTranslationContext(snapshot, registries, metadata, {
		ruleSnapshot: snapshot.rules,
		passiveRecords: snapshot.passiveRecords,
	});
}
