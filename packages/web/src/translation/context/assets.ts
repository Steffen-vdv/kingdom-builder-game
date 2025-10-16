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

const DEFAULT_TRANSFER_INFO = Object.freeze({
	icon: '🔁',
	label: 'Transfer',
});

const DEFAULT_MODIFIER_INFO = Object.freeze({
	cost: Object.freeze({ icon: '💲', label: 'Cost Adjustment' }),
	result: Object.freeze({ icon: '✨', label: 'Outcome Adjustment' }),
}) satisfies Readonly<Record<string, TranslationModifierInfo>>;

const formatRemoval = (description: string) =>
	`Active as long as ${description}`;

type FormatAwareDescriptor = SessionMetadataDescriptor & {
	displayAsPercent?: boolean;
	format?: SessionMetadataFormat;
};

/**
 * Produce a finalized TranslationIconLabel by merging a base label with optional session metadata overrides.
 *
 * @param base - Optional base label whose fields provide default values.
 * @param descriptor - Optional session metadata whose defined fields override the base.
 * @param fallbackLabel - Label to use when neither `descriptor` nor `base` provide a label.
 * @returns A frozen TranslationIconLabel containing merged `icon`, `label`, `description`, `displayAsPercent`, and `format` properties; descriptor values take precedence. If `format` is an object, a shallow copy is made and frozen.
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

/**
 * Build a mapping from stat keys to resolved TranslationIconLabel objects.
 *
 * @param descriptors - Optional mapping of stat keys to session metadata descriptors; each descriptor supplies or overrides icon, label, description, displayAsPercent, and format for that stat.
 * @returns A frozen object mapping each stat key to its resolved TranslationIconLabel; an empty object if `descriptors` is undefined.
 */
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

type ModifierDescriptorOverrides = {
	cost?: SessionMetadataDescriptor;
	result?: SessionMetadataDescriptor;
};

/**
 * Extracts optional modifier descriptor overrides from an unknown value.
 *
 * @param value - A value that may contain `cost` and/or `result` descriptor objects
 * @returns A `ModifierDescriptorOverrides` object with `cost` and/or `result` when present and objects; `undefined` if `value` is falsy, not an object, or contains neither `cost` nor `result`
 */
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
/**
 * Converts a session trigger metadata descriptor into a TranslationTriggerAsset.
 *
 * Copies `icon`, `future`, and `past` from the descriptor when present and sets `label`
 * using `descriptor.label` if available, otherwise `descriptor.past`, otherwise `fallbackLabel`.
 *
 * @param descriptor - Optional trigger metadata to convert into a translation asset
 * @param fallbackLabel - Label to use when the descriptor provides no `label` or `past`
 * @returns A frozen TranslationTriggerAsset containing any of `icon`, `future`, `past`, and `label`
 */
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

/**
 * Build a frozen map of trigger IDs to their corresponding translation assets.
 *
 * @param triggers - Optional mapping of trigger IDs to SessionTriggerMetadata; when omitted or falsy, no triggers are included.
 * @returns A frozen record mapping each trigger ID to a TranslationTriggerAsset; returns an empty frozen object if `triggers` is falsy.
 */
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

/**
 * Assembles translation assets (labels, icons, and formatting) from registries and optional metadata.
 *
 * @param registries - Registries providing population and resource definitions used to build base maps.
 * @param metadata - Optional snapshot metadata containing descriptors for resources, populations, stats, assets, and triggers that override or augment defaults.
 * @param options - Optional settings (for example `rules`) used to derive tier summary text.
 * @returns A frozen TranslationAssets object containing:
 * - `resources`, `populations`, and `stats` maps,
 * - individual asset entries: `population`, `land`, `slot`, `passive`, `transfer`, `upkeep`,
 * - `modifiers` (with `cost` and `result`), `triggers`, and `tierSummaries`,
 * - and the `formatPassiveRemoval` function for formatting passive removal descriptions.
 */
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
	const transferAsset = mergeIconLabel(
		DEFAULT_TRANSFER_INFO,
		assetDescriptors.transfer,
		DEFAULT_TRANSFER_INFO.label,
	);
	const modifierOverrides = resolveModifierDescriptors(
		assetDescriptors['modifiers'],
	);
	const modifiers = Object.freeze({
		cost: mergeIconLabel(
			DEFAULT_MODIFIER_INFO.cost,
			modifierOverrides?.cost,
			DEFAULT_MODIFIER_INFO.cost.label ?? 'Cost Adjustment',
		),
		result: mergeIconLabel(
			DEFAULT_MODIFIER_INFO.result,
			modifierOverrides?.result,
			DEFAULT_MODIFIER_INFO.result.label ?? 'Outcome Adjustment',
		),
	});
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
		transfer: transferAsset,
		upkeep: upkeepAsset,
		modifiers,
		triggers,
		tierSummaries,
		formatPassiveRemoval: formatRemoval,
	});
}