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
import {
	FALLBACK_POPULATION_INFO,
	FALLBACK_RESOURCE_INFO,
	FALLBACK_STAT_INFO,
	getFallbackTriggerAssets,
} from './fallbackAssets';

const DEFAULT_COMMON_ASSETS = Object.freeze({
	population: Object.freeze({ icon: '👥', label: 'Population' }),
	land: Object.freeze({ icon: '🗺️', label: 'Land' }),
	slot: Object.freeze({ icon: '🧩', label: 'Development Slot' }),
	passive: Object.freeze({ icon: '♾️', label: 'Passive' }),
	upkeep: Object.freeze({ icon: '🧹', label: 'Upkeep' }),
});

const DEFAULT_MODIFIER_INFO = Object.freeze({
	cost: Object.freeze({ icon: '💲', label: 'Cost Adjustment' }),
	result: Object.freeze({ icon: '✨', label: 'Outcome Adjustment' }),
}) satisfies Readonly<Record<string, TranslationModifierInfo>>;

const formatRemoval = (description: string) =>
	`Active as long as ${description}`;

function combineIconLabels(
	primary: TranslationIconLabel | undefined,
	fallback: TranslationIconLabel | undefined,
	fallbackLabel: string,
): TranslationIconLabel {
	const entry: TranslationIconLabel = {};
	const icon = primary?.icon ?? fallback?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const label = primary?.label ?? fallback?.label ?? fallbackLabel;
	if (label !== undefined) {
		entry.label = label;
	}
	const description = primary?.description ?? fallback?.description;
	if (description !== undefined) {
		entry.description = description;
	}
	return entry;
}

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
		const fallback = FALLBACK_POPULATION_INFO[id];
		const fallbackLabel = base.label ?? fallback?.label ?? id;
		const combined = combineIconLabels(base, fallback, fallbackLabel);
		entries[id] = mergeIconLabel(combined, descriptors?.[id], fallbackLabel);
	}
	if (descriptors) {
		for (const id of Object.keys(descriptors)) {
			if (entries[id]) {
				continue;
			}
			const descriptor = descriptors[id];
			if (!descriptor) {
				continue;
			}
			const fallback = FALLBACK_POPULATION_INFO[id];
			const fallbackLabel = descriptor.label ?? fallback?.label ?? id;
			entries[id] = mergeIconLabel(fallback, descriptor, fallbackLabel);
		}
	}
	for (const id of Object.keys(FALLBACK_POPULATION_INFO)) {
		if (entries[id]) {
			continue;
		}
		const fallback = FALLBACK_POPULATION_INFO[id];
		if (!fallback) {
			continue;
		}
		const fallbackLabel = fallback.label ?? id;
		entries[id] = mergeIconLabel(fallback, descriptors?.[id], fallbackLabel);
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
		const fallback = FALLBACK_RESOURCE_INFO[key];
		const fallbackLabel = entry.label ?? fallback?.label ?? key;
		const combined = combineIconLabels(entry, fallback, fallbackLabel);
		const descriptor = descriptors?.[key];
		entries[key] = mergeIconLabel(combined, descriptor, fallbackLabel);
	}
	if (descriptors) {
		for (const key of Object.keys(descriptors)) {
			if (entries[key]) {
				continue;
			}
			const descriptor = descriptors[key];
			if (!descriptor) {
				continue;
			}
			const fallback = FALLBACK_RESOURCE_INFO[key];
			const fallbackLabel = descriptor.label ?? fallback?.label ?? key;
			entries[key] = mergeIconLabel(fallback, descriptor, fallbackLabel);
		}
	}
	for (const key of Object.keys(FALLBACK_RESOURCE_INFO)) {
		if (entries[key]) {
			continue;
		}
		const fallback = FALLBACK_RESOURCE_INFO[key];
		if (!fallback) {
			continue;
		}
		const fallbackLabel = fallback.label ?? key;
		entries[key] = mergeIconLabel(fallback, descriptors?.[key], fallbackLabel);
	}
	return Object.freeze(entries);
}

function buildStatMap(
	descriptors?: Record<string, SessionMetadataDescriptor> | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [key, base] of Object.entries(FALLBACK_STAT_INFO)) {
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

function mergeTriggerAsset(
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
	const label = descriptor?.label ?? base?.label ?? past;
	if (label !== undefined) {
		entry.label = label;
	}
	return Object.freeze(entry);
}

function buildTriggerMap(
	triggers?: Record<string, SessionTriggerMetadata> | undefined,
): Readonly<Record<string, TranslationTriggerAsset>> {
	const entries: Record<string, TranslationTriggerAsset> = {
		...getFallbackTriggerAssets(),
	};
	if (!triggers) {
		return Object.freeze(entries);
	}
	for (const [id, descriptor] of Object.entries(triggers)) {
		entries[id] = mergeTriggerAsset(entries[id], descriptor);
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
		DEFAULT_COMMON_ASSETS.population,
		assetDescriptors.population,
		DEFAULT_COMMON_ASSETS.population.label,
	);
	const landAsset = mergeIconLabel(
		DEFAULT_COMMON_ASSETS.land,
		assetDescriptors.land,
		DEFAULT_COMMON_ASSETS.land.label,
	);
	const slotAsset = mergeIconLabel(
		DEFAULT_COMMON_ASSETS.slot,
		assetDescriptors.slot,
		DEFAULT_COMMON_ASSETS.slot.label,
	);
	const passiveAsset = mergeIconLabel(
		DEFAULT_COMMON_ASSETS.passive,
		assetDescriptors.passive,
		DEFAULT_COMMON_ASSETS.passive.label,
	);
	const upkeepAsset = mergeIconLabel(
		DEFAULT_COMMON_ASSETS.upkeep,
		assetDescriptors.upkeep,
		DEFAULT_COMMON_ASSETS.upkeep.label,
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
