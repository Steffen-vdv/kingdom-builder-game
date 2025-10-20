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
	TranslationTriggerAsset,
} from './types';
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

function buildStatMap(
	descriptors: Readonly<Record<string, SessionMetadataDescriptor>>,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [key, descriptor] of Object.entries(descriptors)) {
		entries[key] = mergeIconLabel(undefined, descriptor, key);
	}
	return Object.freeze(entries);
}

type ModifierDescriptorOverrides = {
	cost?: SessionMetadataDescriptor;
	result?: SessionMetadataDescriptor;
};

function resolveModifierDescriptors(
	value: unknown,
): ModifierDescriptorOverrides | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}
	const descriptor = value as Record<string, unknown>;
	if (!('cost' in descriptor) && !('result' in descriptor)) {
		return undefined;
	}
	const overrides: ModifierDescriptorOverrides = {};
	if (descriptor.cost && typeof descriptor.cost === 'object') {
		overrides.cost = descriptor.cost as SessionMetadataDescriptor;
	}
	if (descriptor.result && typeof descriptor.result === 'object') {
		overrides.result = descriptor.result as SessionMetadataDescriptor;
	}
	return overrides;
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

function requireAssetDescriptor(
	descriptors: Readonly<Record<string, SessionMetadataDescriptor>>,
	key: 'land' | 'slot' | 'passive',
): SessionMetadataDescriptor {
	const descriptor = descriptors[key];
	if (!descriptor) {
		throw new Error(
			`Session metadata is missing a descriptor for assets.${key}.`,
		);
	}
	return descriptor;
}

type MetadataRequirementKey =
	| 'resources'
	| 'populations'
	| 'stats'
	| 'assets'
	| 'triggers';

function requireMetadataRecord(
	metadata: SessionSnapshotMetadata,
	key: MetadataRequirementKey,
): Record<string, unknown> {
	const record = metadata[key];
	if (!record) {
		throw new Error(
			`Session metadata must include ${key} descriptors to build ` +
				'translation assets.',
		);
	}
	return record as Record<string, unknown>;
}

export function createTranslationAssets(
	registries: Pick<SessionRegistries, 'populations' | 'resources'>,
	metadata: SessionSnapshotMetadata,
	options?: { rules?: SessionRuleSnapshot },
): TranslationAssets {
	const populationMetadata = requireMetadataRecord(
		metadata,
		'populations',
	) as Record<string, SessionMetadataDescriptor>;
	const resourceMetadata = requireMetadataRecord(
		metadata,
		'resources',
	) as Record<string, SessionMetadataDescriptor>;
	const statMetadata = requireMetadataRecord(metadata, 'stats') as Record<
		string,
		SessionMetadataDescriptor
	>;
	const assetDescriptors = requireMetadataRecord(metadata, 'assets') as Record<
		string,
		SessionMetadataDescriptor
	>;
	const triggerMetadata = requireMetadataRecord(metadata, 'triggers') as Record<
		string,
		SessionTriggerMetadata
	>;
	const populations = buildPopulationMap(
		registries.populations,
		populationMetadata,
	);
	const resources = buildResourceMap(registries.resources, resourceMetadata);
	const stats = buildStatMap(statMetadata);
	const populationAsset = mergeIconLabel(
		undefined,
		assetDescriptors.population,
		'population',
	);
	const landDescriptor = requireAssetDescriptor(assetDescriptors, 'land');
	const landAsset = mergeIconLabel(undefined, landDescriptor, 'land');
	const slotDescriptor = requireAssetDescriptor(assetDescriptors, 'slot');
	const slotAsset = mergeIconLabel(undefined, slotDescriptor, 'slot');
	const passiveDescriptor = requireAssetDescriptor(assetDescriptors, 'passive');
	const passiveAsset = mergeIconLabel(undefined, passiveDescriptor, 'passive');
	const upkeepAsset = mergeIconLabel(
		undefined,
		assetDescriptors.upkeep,
		'upkeep',
	);
	const transferAsset = mergeIconLabel(
		undefined,
		assetDescriptors.transfer,
		'transfer',
	);
	const modifierOverrides = resolveModifierDescriptors(
		assetDescriptors['modifiers'],
	);
	const modifiers = Object.freeze({
		cost: mergeIconLabel(undefined, modifierOverrides?.cost, 'cost'),
		result: mergeIconLabel(undefined, modifierOverrides?.result, 'result'),
	});
	const triggers = buildTriggerMap(triggerMetadata);
	const tierSummaries = buildTierSummaryMap(options?.rules);
	return Object.freeze({
		resources,
		populations,
		stats,
		population: populationAsset,
		land: landAsset,
		slot: slotAsset,
		passive: passiveAsset,
		transfer: transferAsset,
		upkeep: upkeepAsset,
		modifiers,
		triggers,
		tierSummaries,
		formatPassiveRemoval: formatRemoval,
	});
}
