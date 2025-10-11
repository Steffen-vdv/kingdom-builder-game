import type {
        PopulationConfig,
        SessionMetadataDescriptor,
        SessionSnapshotMetadata,
        SessionTriggerMetadata,
} from '@kingdom-builder/protocol';
import type { SessionRegistries } from '../../state/sessionRegistries';
import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationModifierInfo,
} from './types';

const DEFAULT_POPULATION_INFO = Object.freeze({
        icon: '👥',
        label: 'Population',
});

const DEFAULT_LAND_INFO = Object.freeze({
	icon: '🗺️',
	label: 'Land',
});

const DEFAULT_SLOT_INFO = Object.freeze({
	icon: '🧩',
	label: 'Development Slot',
});

const DEFAULT_PASSIVE_INFO = Object.freeze({
        icon: '♾️',
        label: 'Passive',
});

const DEFAULT_MODIFIER_INFO = Object.freeze({
	cost: Object.freeze({ icon: '💲', label: 'Cost Adjustment' }),
	result: Object.freeze({ icon: '✨', label: 'Outcome Adjustment' }),
}) satisfies Readonly<Record<string, TranslationModifierInfo>>;

const DEFAULT_STAT_INFO = Object.freeze({
	maxPopulation: Object.freeze({ icon: '👥', label: 'Max Population' }),
	armyStrength: Object.freeze({ icon: '⚔️', label: 'Army Strength' }),
	fortificationStrength: Object.freeze({
		icon: '🛡️',
		label: 'Fortification Strength',
	}),
	absorption: Object.freeze({ icon: '🌀', label: 'Absorption' }),
	growth: Object.freeze({ icon: '📈', label: 'Growth' }),
	warWeariness: Object.freeze({ icon: '💤', label: 'War Weariness' }),
}) satisfies Readonly<Record<string, TranslationIconLabel>>;

const formatRemoval = (description: string) =>
        `Active as long as ${description}`;

function mergeIconLabel(
        fallback: Readonly<TranslationIconLabel>,
        override?: SessionMetadataDescriptor,
): Readonly<TranslationIconLabel> {
        if (!override) {
                return fallback;
        }
        const entry: TranslationIconLabel = {};
        if (override.icon !== undefined) {
                entry.icon = override.icon;
        } else if (fallback.icon !== undefined) {
                entry.icon = fallback.icon;
        }
        if (override.label !== undefined) {
                entry.label = override.label;
        } else if (fallback.label !== undefined) {
                entry.label = fallback.label;
        }
        if (override.description !== undefined) {
                entry.description = override.description;
        } else if (fallback.description !== undefined) {
                entry.description = fallback.description;
        }
        return Object.freeze(entry);
}

function toIconLabel(
	definition: Partial<PopulationConfig> & {
		id?: string;
		icon?: string | undefined;
		name?: string | undefined;
		label?: string | undefined;
		description?: string | undefined;
	},
	fallbackId: string,
): TranslationIconLabel {
	const label = definition.name ?? definition.label ?? fallbackId;
	const entry: TranslationIconLabel = {};
	if (definition.icon !== undefined) {
		entry.icon = definition.icon;
	}
	if (label !== undefined) {
		entry.label = label;
	}
	if (definition.description !== undefined) {
		entry.description = definition.description;
	}
	return Object.freeze(entry);
}

function buildPopulationMap(
        registry: SessionRegistries['populations'],
): Readonly<Record<string, TranslationIconLabel>> {
        const entries: Record<string, TranslationIconLabel> = {};
        for (const [id, definition] of registry.entries()) {
                entries[id] = toIconLabel(definition, id);
        }
        return Object.freeze(entries);
}

function buildResourceMap(
	resources: SessionRegistries['resources'],
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [key, definition] of Object.entries(resources)) {
		const entry: TranslationIconLabel = {};
		if (definition.icon !== undefined) {
			entry.icon = definition.icon;
		}
		entry.label = definition.label ?? definition.key ?? key;
		if (definition.description !== undefined) {
			entry.description = definition.description;
		}
		entries[key] = Object.freeze(entry);
	}
	return Object.freeze(entries);
}

function buildTriggerMap(
        triggers?: Record<string, SessionTriggerMetadata>,
): Readonly<Record<string, Readonly<{ icon?: string; future?: string; past?: string }>>> {
        if (!triggers) {
                return Object.freeze({});
        }
        const entries: Record<
                string,
                Readonly<{ icon?: string; future?: string; past?: string }>
        > = {};
        for (const [id, metadata] of Object.entries(triggers)) {
                const entry: { icon?: string; future?: string; past?: string } = {};
                if (metadata.icon !== undefined) {
                        entry.icon = metadata.icon;
                }
                if (metadata.future !== undefined) {
                        entry.future = metadata.future;
                }
                if (metadata.past !== undefined) {
                        entry.past = metadata.past;
                }
                entries[id] = Object.freeze(entry);
        }
        return Object.freeze(entries);
}

export function createTranslationAssets(
        registries: Pick<SessionRegistries, 'populations' | 'resources'>,
        metadata?: SessionSnapshotMetadata,
): TranslationAssets {
        const populations = buildPopulationMap(registries.populations);
        const resources = buildResourceMap(registries.resources);
        const assetOverrides = metadata?.assets ?? {};
        const triggers = buildTriggerMap(metadata?.triggers);
        return Object.freeze({
                resources,
                populations,
                stats: DEFAULT_STAT_INFO,
                population: mergeIconLabel(
                        DEFAULT_POPULATION_INFO,
                        assetOverrides['population'],
                ),
                land: mergeIconLabel(DEFAULT_LAND_INFO, assetOverrides['land']),
                slot: mergeIconLabel(DEFAULT_SLOT_INFO, assetOverrides['slot']),
                passive: mergeIconLabel(DEFAULT_PASSIVE_INFO, assetOverrides['passive']),
                triggers,
                modifiers: DEFAULT_MODIFIER_INFO,
                formatPassiveRemoval: formatRemoval,
        });
}
