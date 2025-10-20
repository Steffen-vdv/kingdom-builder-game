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
	descriptors: Readonly<Record<string, SessionMetadataDescriptor>> | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	if (descriptors) {
		for (const [key, descriptor] of Object.entries(descriptors)) {
			entries[key] = mergeIconLabel(undefined, descriptor, key);
		}
	}
	return Object.freeze(entries);
}

type ModifierDescriptorOverrides = {
	cost: SessionMetadataDescriptor;
	result: SessionMetadataDescriptor;
};

function resolveModifierDescriptors(
	value: unknown,
): ModifierDescriptorOverrides {
	if (!value || typeof value !== 'object') {
		throw new Error(
			'Translation assets metadata must include assets.modifiers with cost and result descriptors.',
		);
	}
	const descriptor = value as Record<string, unknown>;
	const overrides: Partial<ModifierDescriptorOverrides> = {};
	if (descriptor.cost && typeof descriptor.cost === 'object') {
		overrides.cost = descriptor.cost as SessionMetadataDescriptor;
	}
	if (descriptor.result && typeof descriptor.result === 'object') {
		overrides.result = descriptor.result as SessionMetadataDescriptor;
	}
	if (!overrides.cost || !overrides.result) {
		throw new Error(
			'Translation assets metadata must define both cost and result descriptors for assets.modifiers.',
		);
	}
	return overrides as ModifierDescriptorOverrides;
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

function requireMetadataSection<TKey extends keyof SessionSnapshotMetadata>(
	metadata: SessionSnapshotMetadata,
	key: TKey,
): NonNullable<SessionSnapshotMetadata[TKey]> {
	const value = metadata[key];
	if (value === undefined || value === null) {
		throw new Error(
			`Translation assets require session metadata for ${String(key)}.`,
		);
	}
	return value as NonNullable<SessionSnapshotMetadata[TKey]>;
}

function requireAssetDescriptor(
	descriptors: NonNullable<SessionSnapshotMetadata['assets']>,
	key: string,
): SessionMetadataDescriptor {
	const descriptor = descriptors[key];
	if (
		!descriptor ||
		typeof descriptor !== 'object' ||
		Array.isArray(descriptor)
	) {
		throw new Error(
			`Translation assets metadata is missing descriptor for assets.${key}.`,
		);
	}
	if ('cost' in descriptor || 'result' in descriptor) {
		throw new Error(
			`Translation assets metadata entry assets.${key} must be a descriptor, not a composite configuration.`,
		);
	}
	return descriptor;
}

function optionalAssetDescriptor(
	descriptors: NonNullable<SessionSnapshotMetadata['assets']>,
	key: string,
): SessionMetadataDescriptor | undefined {
	const descriptor = descriptors[key];
	if (!descriptor) {
		return undefined;
	}
	if (typeof descriptor !== 'object' || Array.isArray(descriptor)) {
		throw new Error(
			`Translation assets metadata entry assets.${key} must be an object descriptor when provided.`,
		);
	}
	if ('cost' in descriptor || 'result' in descriptor) {
		throw new Error(
			`Translation assets metadata entry assets.${key} cannot reuse the modifiers descriptor structure.`,
		);
	}
	return descriptor;
}

export function createTranslationAssets(
	registries: Pick<SessionRegistries, 'populations' | 'resources'>,
	metadata: SessionSnapshotMetadata,
	options?: { rules?: SessionRuleSnapshot },
): TranslationAssets {
	const resourceDescriptors = requireMetadataSection(metadata, 'resources');
	const populationDescriptors = requireMetadataSection(metadata, 'populations');
	const statDescriptors = requireMetadataSection(metadata, 'stats');
	const assetDescriptors = requireMetadataSection(metadata, 'assets');
	const triggerDescriptors = requireMetadataSection(metadata, 'triggers');
	const populations = buildPopulationMap(
		registries.populations,
		populationDescriptors,
	);
	const resources = buildResourceMap(registries.resources, resourceDescriptors);
	const stats = buildStatMap(statDescriptors);
	const populationAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor(assetDescriptors, 'population'),
		'population',
	);
	const landAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor(assetDescriptors, 'land'),
		'land',
	);
	const slotAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor(assetDescriptors, 'slot'),
		'slot',
	);
	const passiveAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor(assetDescriptors, 'passive'),
		'passive',
	);
	const upkeepDescriptor = optionalAssetDescriptor(assetDescriptors, 'upkeep');
	const transferDescriptor = optionalAssetDescriptor(
		assetDescriptors,
		'transfer',
	);
	const modifierOverrides = resolveModifierDescriptors(
		(assetDescriptors as Record<string, unknown>)['modifiers'],
	);
	const modifiers = Object.freeze({
		cost: mergeIconLabel(undefined, modifierOverrides.cost, 'Cost Modifier'),
		result: mergeIconLabel(
			undefined,
			modifierOverrides.result,
			'Result Modifier',
		),
	});
	const triggers = buildTriggerMap(triggerDescriptors);
	const tierSummaries = buildTierSummaryMap(options?.rules);
	return Object.freeze({
		resources,
		populations,
		stats,
		population: populationAsset,
		land: landAsset,
		slot: slotAsset,
		passive: passiveAsset,
		transfer: transferDescriptor
			? mergeIconLabel(undefined, transferDescriptor, 'transfer')
			: Object.freeze({}),
		upkeep: upkeepDescriptor
			? mergeIconLabel(undefined, upkeepDescriptor, 'upkeep')
			: Object.freeze({}),
		modifiers,
		triggers,
		tierSummaries,
		formatPassiveRemoval: formatRemoval,
	});
}
