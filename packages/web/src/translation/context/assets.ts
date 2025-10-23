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
	TranslationResourceV2Registry,
	TranslationTriggerAsset,
} from './types';
import {
	buildPopulationMap,
	buildResourceMap,
	formatRemoval,
	mergeIconLabel,
} from './assetHelpers';
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
			`Session metadata is missing a descriptor for assets.` + `${key}.`,
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
			[
				'Session metadata must include',
				`${key} descriptors`,
				'to build translation assets.',
			].join(' '),
		);
	}
	return record as Record<string, unknown>;
}

export function createTranslationAssets(
	registries: Pick<SessionRegistries, 'populations' | 'resources'>,
	metadata: SessionSnapshotMetadata,
	options?: {
		rules?: SessionRuleSnapshot;
		resourceV2?: TranslationResourceV2Registry;
	},
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
	const resources = buildResourceMap(
		registries.resources,
		resourceMetadata,
		options?.resourceV2,
	);
	const stats = buildStatMap(statMetadata);
	const populationAsset = mergeIconLabel(
		undefined,
		assetDescriptors.population,
		'Population',
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
