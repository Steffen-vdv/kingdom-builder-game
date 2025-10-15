import type { PopulationConfig } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionRuleSnapshot,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../state/sessionRegistries';
import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationModifierInfo,
	TranslationTriggerAsset,
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

const DEFAULT_UPKEEP_INFO = Object.freeze({
	icon: '🧹',
	label: 'Upkeep',
});

const DEFAULT_MODIFIER_INFO = Object.freeze({
	cost: Object.freeze({ icon: '💲', label: 'Cost Adjustment' }),
	result: Object.freeze({ icon: '✨', label: 'Outcome Adjustment' }),
	transfer: Object.freeze({ icon: '🔁', label: 'Transfer Adjustment' }),
}) satisfies Readonly<Record<string, TranslationModifierInfo>>;

const DEFAULT_STAT_INFO = Object.freeze({
	maxPopulation: Object.freeze({
		icon: '👥',
		label: 'Max Population',
		format: Object.freeze({ prefix: 'Max ' }),
	}),
	armyStrength: Object.freeze({ icon: '⚔️', label: 'Army Strength' }),
	fortificationStrength: Object.freeze({
		icon: '🛡️',
		label: 'Fortification Strength',
	}),
	absorption: Object.freeze({
		icon: '🌀',
		label: 'Absorption',
		displayAsPercent: true,
		format: Object.freeze({ percent: true }),
	}),
	growth: Object.freeze({
		icon: '📈',
		label: 'Growth',
		displayAsPercent: true,
		format: Object.freeze({ percent: true }),
	}),
	warWeariness: Object.freeze({ icon: '💤', label: 'War Weariness' }),
}) satisfies Readonly<Record<string, TranslationIconLabel>>;

const formatRemoval = (description: string) =>
	`Active as long as ${description}`;

type ExtendedDescriptor = SessionMetadataDescriptor & {
	displayAsPercent?: boolean;
	format?: { prefix?: string; percent?: boolean };
};

function mergeIconLabel(
	base: TranslationIconLabel | undefined,
	descriptor: SessionMetadataDescriptor | undefined,
	fallbackLabel: string,
): TranslationIconLabel {
	const entry: TranslationIconLabel = {};
	const icon = descriptor?.icon ?? base?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const label = descriptor?.label ?? base?.label ?? fallbackLabel;
	if (label !== undefined) {
		entry.label = label;
	}
	const description = descriptor?.description ?? base?.description;
	if (description !== undefined) {
		entry.description = description;
	}
	const extendedDescriptor = descriptor as ExtendedDescriptor | undefined;
	const percentFlag = extendedDescriptor?.displayAsPercent;
	if (percentFlag !== undefined) {
		entry.displayAsPercent = percentFlag;
	} else if (base?.displayAsPercent !== undefined) {
		entry.displayAsPercent = base.displayAsPercent;
	}
	const format = extendedDescriptor?.format ?? base?.format;
	if (format !== undefined) {
		entry.format = Object.freeze({ ...format });
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
	descriptors?: Record<string, SessionMetadataDescriptor> | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [id, definition] of registry.entries()) {
		const base = toIconLabel(definition, id);
		entries[id] = mergeIconLabel(base, descriptors?.[id], base.label ?? id);
	}
	return Object.freeze(entries);
}

function buildResourceMap(
	resources: SessionRegistries['resources'],
	descriptors?: Record<string, SessionMetadataDescriptor> | undefined,
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
		const descriptor = descriptors?.[key];
		entries[key] = mergeIconLabel(entry, descriptor, entry.label ?? key);
	}
	return Object.freeze(entries);
}

function buildStatMap(
	descriptors?: Record<string, SessionMetadataDescriptor> | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [key, base] of Object.entries(DEFAULT_STAT_INFO)) {
		entries[key] = mergeIconLabel(base, descriptors?.[key], base.label ?? key);
	}
	if (descriptors) {
		for (const [key, descriptor] of Object.entries(descriptors)) {
			if (entries[key]) {
				continue;
			}
			entries[key] = mergeIconLabel(undefined, descriptor, key);
		}
	}
	return Object.freeze(entries);
}

const formatDefaultLabel = (value: string): string => {
	const spaced = value
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
	const trimmed = spaced.trim();
	if (!trimmed) {
		return value;
	}
	return trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
};

function mergeTriggerAsset(
	id: string,
	base: TranslationTriggerAsset | undefined,
	descriptor: SessionTriggerMetadata | undefined,
): TranslationTriggerAsset {
	const entry: TranslationTriggerAsset = {};
	const icon = descriptor?.icon ?? base?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const future = descriptor?.future ?? base?.future;
	if (future !== undefined) {
		entry.future = future;
	}
	const past = descriptor?.past ?? base?.past;
	if (past !== undefined) {
		entry.past = past;
	}
	const label =
		descriptor?.label ??
		base?.label ??
		past ??
		descriptor?.future ??
		base?.future;
	if (label !== undefined) {
		entry.label = label;
	} else {
		entry.label = formatDefaultLabel(id);
	}
	return Object.freeze(entry);
}

function buildTriggerMap(
	triggers?: Record<string, SessionTriggerMetadata> | undefined,
): Readonly<Record<string, TranslationTriggerAsset>> {
	if (!triggers) {
		return Object.freeze({});
	}
	const entries: Record<string, TranslationTriggerAsset> = {};
	for (const [id, descriptor] of Object.entries(triggers)) {
		const base = entries[id];
		entries[id] = mergeTriggerAsset(id, base, descriptor);
	}
	return Object.freeze(entries);
}

function buildTierSummaryMap(
	rules?: SessionRuleSnapshot,
): Readonly<Record<string, string>> {
	if (!rules) {
		return Object.freeze({});
	}
	const entries: Record<string, string> = {};
	for (const definition of rules.tierDefinitions) {
		const token = definition.display?.summaryToken;
		const summary = definition.text?.summary;
		if (typeof token === 'string' && typeof summary === 'string') {
			entries[token] = summary;
		}
	}
	return Object.freeze(entries);
}

export function createTranslationAssets(
	registries: Pick<SessionRegistries, 'populations' | 'resources'>,
	metadata?: Pick<
		SessionSnapshotMetadata,
		'resources' | 'populations' | 'stats' | 'assets' | 'triggers'
	>,
	options?: { rules?: SessionRuleSnapshot },
): TranslationAssets {
	const populations = buildPopulationMap(
		registries.populations,
		metadata?.populations,
	);
	const resources = buildResourceMap(registries.resources, metadata?.resources);
	const stats = buildStatMap(metadata?.stats);
	const assetDescriptors = metadata?.assets ?? {};
	const populationAsset = mergeIconLabel(
		DEFAULT_POPULATION_INFO,
		assetDescriptors.population,
		DEFAULT_POPULATION_INFO.label,
	);
	const landAsset = mergeIconLabel(
		DEFAULT_LAND_INFO,
		assetDescriptors.land,
		DEFAULT_LAND_INFO.label,
	);
	const slotAsset = mergeIconLabel(
		DEFAULT_SLOT_INFO,
		assetDescriptors.slot,
		DEFAULT_SLOT_INFO.label,
	);
	const passiveAsset = mergeIconLabel(
		DEFAULT_PASSIVE_INFO,
		assetDescriptors.passive,
		DEFAULT_PASSIVE_INFO.label,
	);
	const upkeepAsset = mergeIconLabel(
		DEFAULT_UPKEEP_INFO,
		assetDescriptors.upkeep,
		DEFAULT_UPKEEP_INFO.label,
	);
	const triggers = buildTriggerMap(metadata?.triggers);
	const tierSummaries = buildTierSummaryMap(options?.rules);
	return Object.freeze({
		resources,
		populations,
		stats,
		population: populationAsset,
		land: landAsset,
		slot: slotAsset,
		passive: passiveAsset,
		upkeep: upkeepAsset,
		modifiers: DEFAULT_MODIFIER_INFO,
		triggers,
		tierSummaries,
		formatPassiveRemoval: formatRemoval,
	});
}
