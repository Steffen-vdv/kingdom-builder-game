import type { PopulationConfig } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionRuleSnapshot,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import {
	DEFAULT_ASSET_METADATA,
	DEFAULT_TRIGGER_METADATA,
} from '../../contexts/defaultRegistryMetadata';
import type { SessionRegistries } from '../../state/sessionRegistries';
import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationModifierInfo,
	TranslationTriggerAsset,
} from './types';

const EMOJI_POPULATION_INFO = Object.freeze({
	icon: '👥',
	label: 'Population',
});

const EMOJI_LAND_INFO = Object.freeze({
	icon: '🗺️',
	label: 'Land',
});

const EMOJI_SLOT_INFO = Object.freeze({
	icon: '🧩',
	label: 'Development Slot',
});

const EMOJI_PASSIVE_INFO = Object.freeze({
	icon: '♾️',
	label: 'Passive',
});

const EMOJI_UPKEEP_INFO = Object.freeze({
	icon: '🧹',
	label: 'Upkeep',
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
	absorption: Object.freeze({
		icon: '🌀',
		label: 'Absorption',
		displayAsPercent: true,
	}),
	growth: Object.freeze({
		icon: '📈',
		label: 'Growth',
		displayAsPercent: true,
	}),
	warWeariness: Object.freeze({ icon: '💤', label: 'War Weariness' }),
}) satisfies Readonly<Record<string, TranslationIconLabel>>;

const formatRemoval = (description: string) =>
	`Active as long as ${description}`;

type PercentAwareDescriptor = SessionMetadataDescriptor & {
	displayAsPercent?: boolean;
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
	const percentFlag = (descriptor as PercentAwareDescriptor | undefined)
		?.displayAsPercent;
	if (percentFlag !== undefined) {
		entry.displayAsPercent = percentFlag;
	} else if (base?.displayAsPercent !== undefined) {
		entry.displayAsPercent = base.displayAsPercent;
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
	descriptors: Record<string, SessionMetadataDescriptor> | undefined,
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

const DEFAULT_TRIGGER_ASSETS = Object.freeze(
	Object.fromEntries(
		Object.entries(DEFAULT_TRIGGER_METADATA ?? {}).map(([id, descriptor]) => [
			id,
			mergeTriggerAsset(undefined, descriptor),
		]),
	),
);

function buildTriggerMap(
	triggers: Record<string, SessionTriggerMetadata> | undefined,
): Readonly<Record<string, TranslationTriggerAsset>> {
	const entries: Record<string, TranslationTriggerAsset> = {
		...DEFAULT_TRIGGER_ASSETS,
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
	const resolveAsset = (
		key: 'population' | 'land' | 'slot' | 'passive' | 'upkeep',
		emojiFallback: TranslationIconLabel,
	): TranslationIconLabel => {
		const metadataDescriptor = DEFAULT_ASSET_METADATA?.[key];
		const baseAsset =
			metadataDescriptor !== undefined
				? mergeIconLabel(
						emojiFallback,
						metadataDescriptor,
						metadataDescriptor.label ?? emojiFallback.label ?? key,
					)
				: emojiFallback;
		return mergeIconLabel(
			baseAsset,
			metadata?.assets?.[key],
			baseAsset.label ?? emojiFallback.label ?? key,
		);
	};
	const populationAsset = resolveAsset('population', EMOJI_POPULATION_INFO);
	const landAsset = resolveAsset('land', EMOJI_LAND_INFO);
	const slotAsset = resolveAsset('slot', EMOJI_SLOT_INFO);
	const passiveAsset = resolveAsset('passive', EMOJI_PASSIVE_INFO);
	const upkeepAsset = resolveAsset('upkeep', EMOJI_UPKEEP_INFO);
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
