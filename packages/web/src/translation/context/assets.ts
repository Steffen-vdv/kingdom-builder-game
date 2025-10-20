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

export function createTranslationAssets(
	registries: Pick<SessionRegistries, 'populations' | 'resources'>,
	metadata: Pick<
		SessionSnapshotMetadata,
		'resources' | 'populations' | 'stats' | 'assets' | 'triggers'
	>,
	options?: { rules?: SessionRuleSnapshot },
): TranslationAssets {
	if (!metadata) {
		throw new Error(
			'Session metadata is required to build translation assets.',
		);
	}
	const {
		populations: populationDescriptors,
		resources: resourceDescriptors,
		stats: statDescriptors,
		assets: assetDescriptors,
		triggers: triggerDescriptors,
	} = metadata;
	if (!populationDescriptors) {
		throw new Error(
			'Session metadata is missing required "populations" descriptors for translation assets.',
		);
	}
	if (!resourceDescriptors) {
		throw new Error(
			'Session metadata is missing required "resources" descriptors for translation assets.',
		);
	}
	if (!statDescriptors) {
		throw new Error(
			'Session metadata is missing required "stats" descriptors for translation assets.',
		);
	}
	if (!assetDescriptors) {
		throw new Error(
			'Session metadata is missing required "assets" descriptors for translation assets.',
		);
	}
	if (!triggerDescriptors) {
		throw new Error(
			'Session metadata is missing required "triggers" descriptors for translation assets.',
		);
	}
	const populations = buildPopulationMap(
		registries.populations,
		populationDescriptors,
	);
	const resources = buildResourceMap(registries.resources, resourceDescriptors);
	const stats = buildStatMap(statDescriptors);
	const requireAssetDescriptor = (key: string): SessionMetadataDescriptor => {
		const descriptor = assetDescriptors[key];
		if (!descriptor || typeof descriptor !== 'object') {
			throw new Error(
				`Session metadata must provide a descriptor for "assets.${key}" to build translation assets.`,
			);
		}
		return descriptor;
	};
	const populationAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor('population'),
		'population',
	);
	const landAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor('land'),
		'land',
	);
	const slotAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor('slot'),
		'slot',
	);
	const passiveAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor('passive'),
		'passive',
	);
	const upkeepAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor('upkeep'),
		'upkeep',
	);
	const transferAsset = mergeIconLabel(
		undefined,
		requireAssetDescriptor('transfer'),
		'transfer',
	);
	const modifierOverrides = resolveModifierDescriptors(
		assetDescriptors['modifiers'],
	);
	if (!modifierOverrides?.cost || !modifierOverrides.result) {
		throw new Error(
			'Session metadata must describe both assets.modifiers.cost and assets.modifiers.result to build translation assets.',
		);
	}
	const modifiers: Readonly<Record<string, TranslationModifierInfo>> =
		Object.freeze({
			cost: mergeIconLabel(undefined, modifierOverrides.cost, 'cost modifier'),
			result: mergeIconLabel(
				undefined,
				modifierOverrides.result,
				'result modifier',
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
		transfer: transferAsset,
		upkeep: upkeepAsset,
		modifiers,
		triggers,
		tierSummaries,
		formatPassiveRemoval: formatRemoval,
	});
}
