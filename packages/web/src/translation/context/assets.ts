import type { PopulationConfig } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionRuleSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../state/sessionRegistries';
import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationModifierInfo,
	TranslationTriggerInfo,
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

const EMPTY_ICON_LABEL = Object.freeze({}) as Readonly<TranslationIconLabel>;

type MetadataSubset = Pick<
	SessionSnapshotMetadata,
	'resources' | 'populations' | 'stats' | 'triggers' | 'assets'
>;

function mergeIconLabel(
	base: TranslationIconLabel,
	descriptor: SessionMetadataDescriptor | undefined,
	fallbackLabel: string,
): TranslationIconLabel {
	const entry: TranslationIconLabel = { ...base };
	if (descriptor?.icon !== undefined) {
		entry.icon = descriptor.icon;
	}
	if (descriptor?.label !== undefined) {
		entry.label = descriptor.label;
	} else if (entry.label === undefined) {
		entry.label = fallbackLabel;
	}
	if (descriptor?.description !== undefined) {
		entry.description = descriptor.description;
	}
	return Object.freeze(entry);
}

function mergeIconOnly(
	descriptor: SessionMetadataDescriptor | undefined,
	fallback: TranslationIconLabel,
): TranslationIconLabel {
	if (!descriptor) {
		return fallback;
	}
	const entry: TranslationIconLabel = { ...fallback };
	if (descriptor.icon !== undefined) {
		entry.icon = descriptor.icon;
	}
	if (descriptor.label !== undefined) {
		entry.label = descriptor.label;
	}
	if (descriptor.description !== undefined) {
		entry.description = descriptor.description;
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
	metadata: MetadataSubset['populations'],
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [id, definition] of registry.entries()) {
		const base = toIconLabel(definition, id);
		entries[id] = mergeIconLabel(base, metadata?.[id], base.label ?? id);
	}
	return Object.freeze(entries);
}

function buildResourceMap(
	resources: SessionRegistries['resources'],
	metadata: MetadataSubset['resources'],
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
		entries[key] = mergeIconLabel(entry, metadata?.[key], key);
	}
	return Object.freeze(entries);
}

function buildStatMap(
	metadata: MetadataSubset['stats'],
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	const defaults = DEFAULT_STAT_INFO;
	for (const [key, fallback] of Object.entries(defaults)) {
		entries[key] = mergeIconOnly(metadata?.[key], fallback);
	}
	if (metadata) {
		for (const [key, descriptor] of Object.entries(metadata)) {
			if (entries[key]) {
				continue;
			}
			entries[key] = mergeIconOnly(descriptor, EMPTY_ICON_LABEL);
		}
	}
	return Object.freeze(entries);
}

function buildMiscAssetMap(
	metadata: MetadataSubset['assets'],
): Readonly<Record<string, TranslationIconLabel>> {
	if (!metadata) {
		return Object.freeze({});
	}
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [key, descriptor] of Object.entries(metadata)) {
		entries[key] = mergeIconOnly(descriptor, EMPTY_ICON_LABEL);
	}
	return Object.freeze(entries);
}

function buildTriggerMap(
	metadata: MetadataSubset['triggers'],
): Readonly<Record<string, TranslationTriggerInfo>> {
	if (!metadata) {
		return Object.freeze({});
	}
	const entries: Record<string, TranslationTriggerInfo> = {};
	for (const [key, descriptor] of Object.entries(metadata)) {
		const entry: TranslationTriggerInfo = {};
		if (descriptor.icon !== undefined) {
			entry.icon = descriptor.icon;
		}
		if (descriptor.label !== undefined) {
			entry.label = descriptor.label;
		}
		if (descriptor.future !== undefined) {
			entry.future = descriptor.future;
		}
		if (descriptor.past !== undefined) {
			entry.past = descriptor.past;
		}
		entries[key] = Object.freeze(entry);
	}
	return Object.freeze(entries);
}

export function createTranslationAssets(
	registries: Pick<SessionRegistries, 'populations' | 'resources'>,
	metadata: MetadataSubset = {},
	rules?: SessionRuleSnapshot,
): TranslationAssets {
	const populations = buildPopulationMap(
		registries.populations,
		metadata.populations,
	);
	const resources = buildResourceMap(registries.resources, metadata.resources);
	const stats = buildStatMap(metadata.stats);
	const misc = buildMiscAssetMap(metadata.assets);
	const triggers = buildTriggerMap(metadata.triggers);
	const land = mergeIconOnly(metadata.assets?.land, DEFAULT_LAND_INFO);
	const slot = mergeIconOnly(metadata.assets?.slot, DEFAULT_SLOT_INFO);
	const passive = mergeIconOnly(metadata.assets?.passive, DEFAULT_PASSIVE_INFO);
	const population = mergeIconOnly(
		metadata.assets?.population,
		DEFAULT_POPULATION_INFO,
	);
	const tierSummaries = new Map<string, string>();
	const tierDefinitions = rules?.tierDefinitions ?? [];
	for (const tier of tierDefinitions) {
		const token = tier.display?.summaryToken;
		const summary = tier.text?.summary;
		if (token && summary) {
			tierSummaries.set(token, summary);
		}
	}

	return Object.freeze({
		resources,
		populations,
		stats,
		population,
		land,
		slot,
		passive,
		modifiers: DEFAULT_MODIFIER_INFO,
		triggers,
		misc,
		tierSummaries,
		formatPassiveRemoval: formatRemoval,
	});
}
