import type { PopulationConfig } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionMetadataFormat,
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

export const DEFAULT_MODIFIER_INFO = Object.freeze({
	cost: Object.freeze({ icon: '💲', label: 'Cost Adjustment' }),
	result: Object.freeze({ icon: '✨', label: 'Outcome Adjustment' }),
	transfer: Object.freeze({ icon: '🔁', label: 'Transfer Adjustment' }),
}) satisfies Readonly<Record<string, TranslationModifierInfo>>;

const formatRemoval = (description: string) =>
	`Active as long as ${description}`;

type FormatAwareDescriptor = SessionMetadataDescriptor & {
	displayAsPercent?: boolean;
	format?: SessionMetadataFormat;
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
	const percentFlag = (descriptor as FormatAwareDescriptor | undefined)
		?.displayAsPercent;
	if (percentFlag !== undefined) {
		entry.displayAsPercent = percentFlag;
	} else if (base?.displayAsPercent !== undefined) {
		entry.displayAsPercent = base.displayAsPercent;
	}
	const format = (descriptor as FormatAwareDescriptor | undefined)?.format;
	const baseFormat = base?.format;
	const appliedFormat = format ?? baseFormat;
	if (appliedFormat !== undefined) {
		if (typeof appliedFormat === 'string') {
			entry.format = appliedFormat;
		} else {
			entry.format = Object.freeze({ ...appliedFormat });
		}
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
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
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
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
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

function extractModifierDescriptors(
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): Record<string, SessionMetadataDescriptor> | undefined {
	if (!descriptors) {
		return undefined;
	}
	const entries: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, descriptor] of Object.entries(descriptors)) {
		if (!key.startsWith('modifiers.')) {
			continue;
		}
		const modifierKey = key.slice('modifiers.'.length);
		if (!modifierKey) {
			continue;
		}
		entries[modifierKey] = descriptor;
	}
	return Object.keys(entries).length > 0 ? entries : undefined;
}

function buildModifierInfo(
	defaults: Readonly<Record<string, TranslationModifierInfo>>,
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): Readonly<Record<string, TranslationModifierInfo>> {
	const entries: Record<string, TranslationModifierInfo> = {};
	const descriptorEntries = descriptors ? Object.entries(descriptors) : [];
	const keys = new Set([
		...Object.keys(defaults),
		...descriptorEntries.map(([key]) => key),
	]);
	for (const key of keys) {
		const base = defaults[key];
		const descriptor = descriptors?.[key];
		const entry: TranslationModifierInfo = {};
		if (descriptor?.icon !== undefined) {
			entry.icon = descriptor.icon;
		} else if (base?.icon !== undefined) {
			entry.icon = base.icon;
		}
		const fallbackLabel = base?.label ?? key;
		if (descriptor?.label !== undefined) {
			entry.label = descriptor.label;
		} else if (fallbackLabel !== undefined) {
			entry.label = fallbackLabel;
		}
		entries[key] = Object.freeze(entry);
	}
	return Object.freeze(entries);
}

function buildStatMap(
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	if (descriptors) {
		for (const [key, descriptor] of Object.entries(descriptors)) {
			entries[key] = mergeIconLabel(undefined, descriptor, key);
		}
	}
	return Object.freeze(entries);
}
function toTriggerAsset(
	descriptor: SessionTriggerMetadata | undefined,
	fallbackLabel: string,
): TranslationTriggerAsset {
	const entry: TranslationTriggerAsset = {};
	if (descriptor?.icon !== undefined) {
		entry.icon = descriptor.icon;
	}
	if (descriptor?.future !== undefined) {
		entry.future = descriptor.future;
	}
	if (descriptor?.past !== undefined) {
		entry.past = descriptor.past;
	}
	const label = descriptor?.label ?? descriptor?.past ?? fallbackLabel;
	if (label !== undefined) {
		entry.label = label;
	}
	return Object.freeze(entry);
}

function buildTriggerMap(
	triggers: Record<string, SessionTriggerMetadata> | undefined,
): Readonly<Record<string, TranslationTriggerAsset>> {
	if (!triggers) {
		return Object.freeze({});
	}
	const entries: Record<string, TranslationTriggerAsset> = {};
	for (const [id, descriptor] of Object.entries(triggers)) {
		entries[id] = toTriggerAsset(descriptor, id);
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
	const modifierDescriptors = extractModifierDescriptors(assetDescriptors);
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
		modifiers: buildModifierInfo(DEFAULT_MODIFIER_INFO, modifierDescriptors),
		triggers,
		tierSummaries,
		formatPassiveRemoval: formatRemoval,
	});
}
