import type {
	PopulationConfig,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import type { SessionRegistries } from '../../state/sessionRegistries';
import type {
	TranslationAssets,
	TranslationIconLabel,
	TranslationPhaseAsset,
	TranslationStatMetadata,
	TranslationModifierInfo,
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

const DEFAULT_RESOURCE_TRANSFER_ICON = '🔁';

const DEFAULT_STAT_INFO: Readonly<Record<string, TranslationStatMetadata>> =
	Object.freeze({
		maxPopulation: Object.freeze({
			icon: '👥',
			label: 'Max Population',
			addFormat: Object.freeze({ prefix: 'Max ' }),
		}),
		armyStrength: Object.freeze({
			icon: '⚔️',
			label: 'Army Strength',
		}),
		fortificationStrength: Object.freeze({
			icon: '🛡️',
			label: 'Fortification Strength',
		}),
		absorption: Object.freeze({
			icon: '🌀',
			label: 'Absorption',
			addFormat: Object.freeze({ percent: true }),
		}),
		growth: Object.freeze({
			icon: '📈',
			label: 'Growth',
			addFormat: Object.freeze({ percent: true }),
		}),
		warWeariness: Object.freeze({
			icon: '💤',
			label: 'War Weariness',
		}),
	});

const formatRemoval = (description: string) =>
	`Active as long as ${description}`;

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

function mergeIconLabel(
	base: TranslationIconLabel | undefined,
	overrides: TranslationIconLabel | undefined,
	fallbackId: string,
): TranslationIconLabel {
	const merged: TranslationIconLabel = {};
	const icon = overrides?.icon ?? base?.icon;
	if (icon !== undefined) {
		merged.icon = icon;
	}
	const label = overrides?.label ?? base?.label ?? fallbackId;
	if (label !== undefined) {
		merged.label = label;
	}
	const description = overrides?.description ?? base?.description;
	if (description !== undefined) {
		merged.description = description;
	}
	return Object.freeze(merged);
}

function buildPopulationMap(
	registry: SessionRegistries['populations'],
	metadata: SessionSnapshotMetadata['populations'] | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [id, definition] of registry.entries()) {
		const base = toIconLabel(definition, id);
		const overrides = metadata?.[id];
		entries[id] = mergeIconLabel(base, overrides, id);
	}
	return Object.freeze(entries);
}

function buildResourceMap(
	resources: SessionRegistries['resources'],
	metadata: SessionSnapshotMetadata['resources'] | undefined,
): Readonly<Record<string, TranslationIconLabel>> {
	const entries: Record<string, TranslationIconLabel> = {};
	for (const [key, definition] of Object.entries(resources)) {
		const base: TranslationIconLabel = {};
		if (definition.icon !== undefined) {
			base.icon = definition.icon;
		}
		base.label = definition.label ?? definition.key ?? key;
		if (definition.description !== undefined) {
			base.description = definition.description;
		}
		const overrides = metadata?.[key];
		entries[key] = mergeIconLabel(base, overrides, key);
	}
	return Object.freeze(entries);
}

function buildStatMap(
	metadata: SessionSnapshotMetadata['stats'] | undefined,
): Readonly<Record<string, TranslationStatMetadata>> {
	const entries: Record<string, TranslationStatMetadata> = {};
	for (const key of Object.keys(DEFAULT_STAT_INFO)) {
		const defaultEntry = DEFAULT_STAT_INFO[key]!;
		const overrides = metadata?.[key];
		const entryKey = key;
		const addFormat = defaultEntry.addFormat;
		entries[entryKey] = Object.freeze({
			...mergeIconLabel(defaultEntry, overrides, entryKey),
			...(addFormat ? { addFormat } : {}),
		});
	}
	if (metadata) {
		for (const key of Object.keys(metadata)) {
			if (entries[key]) {
				continue;
			}
			const overrides = metadata[key];
			entries[key] = mergeIconLabel({}, overrides, key);
		}
	}
	return Object.freeze(entries);
}

function resolveAssetDescriptor(
	base: TranslationIconLabel,
	overrides: TranslationIconLabel | undefined,
	fallbackLabel: string,
): TranslationIconLabel {
	return mergeIconLabel(base, overrides, fallbackLabel);
}

function buildPhaseMap(
	metadata: SessionSnapshotMetadata['phases'] | undefined,
): Readonly<Record<string, TranslationPhaseAsset>> | undefined {
	if (!metadata) {
		return undefined;
	}
	const entries: Record<string, TranslationPhaseAsset> = {};
	for (const [key, descriptor] of Object.entries(metadata)) {
		if (!descriptor) {
			continue;
		}
		const iconLabel = mergeIconLabel({}, descriptor, key);
		const triggers = new Set<string>();
		if (Array.isArray(descriptor.steps)) {
			for (const step of descriptor.steps) {
				if (!step) {
					continue;
				}
				for (const trigger of step.triggers ?? []) {
					triggers.add(trigger);
				}
			}
		}
		entries[key] = Object.freeze({
			...iconLabel,
			...(triggers.size ? { triggers: Object.freeze([...triggers]) } : {}),
		});
	}
	return Object.freeze(entries);
}

function resolveResourceTransferIcon(
	metadata: SessionSnapshotMetadata['assets'] | undefined,
): string | undefined {
	const override =
		metadata?.resourceTransfer?.icon ?? metadata?.resourceTransferIcon?.icon;
	return override ?? metadata?.resourceTransferIcon?.label ?? undefined;
}

export function createTranslationAssets(
	registries: Pick<SessionRegistries, 'populations' | 'resources'>,
	metadata?: Pick<
		SessionSnapshotMetadata,
		'resources' | 'populations' | 'stats' | 'assets' | 'phases'
	>,
): TranslationAssets {
	const populations = buildPopulationMap(
		registries.populations,
		metadata?.populations,
	);
	const resources = buildResourceMap(registries.resources, metadata?.resources);
	const stats = buildStatMap(metadata?.stats);
	const population = resolveAssetDescriptor(
		DEFAULT_POPULATION_INFO,
		metadata?.assets?.population,
		'Population',
	);
	const land = resolveAssetDescriptor(
		DEFAULT_LAND_INFO,
		metadata?.assets?.land,
		'Land',
	);
	const slot = resolveAssetDescriptor(
		DEFAULT_SLOT_INFO,
		metadata?.assets?.slot,
		'Development Slot',
	);
	const passive = resolveAssetDescriptor(
		DEFAULT_PASSIVE_INFO,
		metadata?.assets?.passive,
		'Passive',
	);
	const modifiers = DEFAULT_MODIFIER_INFO;
	const phases = buildPhaseMap(metadata?.phases);
	const resourceTransferIcon =
		resolveResourceTransferIcon(metadata?.assets) ||
		DEFAULT_RESOURCE_TRANSFER_ICON;
	const baseAssets: Omit<TranslationAssets, 'phases'> & {
		phases?: Readonly<Record<string, TranslationPhaseAsset>>;
	} = {
		resources,
		populations,
		stats,
		population,
		land,
		slot,
		passive,
		modifiers,
		resourceTransferIcon,
		formatPassiveRemoval: formatRemoval,
	};
	const assets = phases ? { ...baseAssets, phases } : baseAssets;
	return Object.freeze(assets);
}
