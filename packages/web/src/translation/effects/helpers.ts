import type {
	TranslationAssets,
	TranslationContext,
	TranslationStatMetadata,
} from '../context';
import {
	formatPassiveRemoval,
	LAND_INFO,
	MODIFIER_INFO,
	PASSIVE_INFO,
	POPULATION_INFO,
	POPULATIONS,
	RESOURCE_TRANSFER_ICON,
	RESOURCES,
	STATS,
	SLOT_INFO,
} from '@kingdom-builder/contents';

type LegacyContext = TranslationContext & { assets?: TranslationAssets };

type IconLike = {
	icon?: string | null | undefined;
	label?: string | null | undefined;
	name?: string | null | undefined;
	description?: string | null | undefined;
};

type PhaseAssetMap = Readonly<
	Record<
		string,
		{ icon?: string; label?: string; triggers?: readonly string[] }
	>
>;

const legacyAssetCache = new WeakMap<object, TranslationAssets>();

const toIconLabel = (
	source: IconLike,
): { icon?: string; label?: string; description?: string } => {
	const entry: { icon?: string; label?: string; description?: string } = {};
	const icon = typeof source.icon === 'string' ? source.icon : undefined;
	if (icon !== undefined && icon.length > 0) {
		entry.icon = icon;
	}
	const labelCandidate =
		typeof source.label === 'string' && source.label.length > 0
			? source.label
			: typeof source.name === 'string' && source.name.length > 0
				? source.name
				: undefined;
	if (labelCandidate !== undefined) {
		entry.label = labelCandidate;
	}
	const description =
		typeof source.description === 'string' && source.description.length > 0
			? source.description
			: undefined;
	if (description !== undefined) {
		entry.description = description;
	}
	return entry;
};

function buildPopulationAssets(
	context: TranslationContext,
): Readonly<
	Record<string, { icon?: string; label?: string; description?: string }>
> {
	const entries: Record<
		string,
		{ icon?: string; label?: string; description?: string }
	> = {};
	const legacy = context as unknown as {
		populations?: { entries(): [string, IconLike][] };
	};
	const fromContext = legacy.populations?.entries?.();
	if (Array.isArray(fromContext)) {
		for (const [id, definition] of fromContext) {
			entries[id] = Object.freeze(toIconLabel(definition));
		}
	}
	for (const [id, definition] of POPULATIONS.entries()) {
		if (entries[id]) {
			continue;
		}
		entries[id] = Object.freeze(toIconLabel(definition as IconLike));
	}
	return Object.freeze(entries);
}

function buildResourceAssets(): Readonly<
	Record<string, { icon?: string; label?: string; description?: string }>
> {
	const entries: Record<
		string,
		{ icon?: string; label?: string; description?: string }
	> = {};
	for (const [key, definition] of Object.entries(RESOURCES)) {
		entries[key] = Object.freeze(toIconLabel(definition));
	}
	return Object.freeze(entries);
}

function buildStatAssets(): Readonly<Record<string, TranslationStatMetadata>> {
	const entries: Record<string, TranslationStatMetadata> = {};
	for (const [key, definition] of Object.entries(STATS)) {
		const iconLabel = toIconLabel(definition);
		entries[key] = Object.freeze({
			...iconLabel,
			...(definition.addFormat
				? { addFormat: { ...definition.addFormat } }
				: {}),
		});
	}
	return Object.freeze(entries);
}

function buildModifierAssets(): Readonly<
	Record<string, { icon?: string; label?: string }>
> {
	const entries: Record<string, { icon?: string; label?: string }> = {};
	for (const [key, definition] of Object.entries(MODIFIER_INFO)) {
		const iconLabel = toIconLabel(definition);
		entries[key] = Object.freeze({
			...(iconLabel.icon ? { icon: iconLabel.icon } : {}),
			...(iconLabel.label ? { label: iconLabel.label } : {}),
		});
	}
	return Object.freeze(entries);
}

function buildPhaseAssets(
	context: TranslationContext,
): PhaseAssetMap | undefined {
	const phases = context.phases;
	if (!phases.length) {
		return undefined;
	}
	const entries: Record<
		string,
		{ icon?: string; label?: string; triggers?: readonly string[] }
	> = {};
	for (const phase of phases) {
		if (!phase) {
			continue;
		}
		const triggers = new Set<string>();
		for (const step of phase.steps ?? []) {
			if (!step) {
				continue;
			}
			for (const trigger of step.triggers ?? []) {
				if (trigger.length > 0) {
					triggers.add(trigger);
				}
			}
		}
		entries[phase.id] = Object.freeze({
			...toIconLabel(phase as IconLike),
			...(triggers.size ? { triggers: Object.freeze([...triggers]) } : {}),
		});
	}
	return Object.freeze(entries);
}

function buildIconLabel(
	info: IconLike,
	fallback: string,
): Readonly<{ icon?: string; label?: string; description?: string }> {
	const iconLabel = toIconLabel(info);
	if (!iconLabel.label) {
		iconLabel.label = fallback;
	}
	return Object.freeze(iconLabel);
}

function createLegacyAssets(context: TranslationContext): TranslationAssets {
	const resources = buildResourceAssets();
	const stats = buildStatAssets();
	const populations = buildPopulationAssets(context);
	const population = buildIconLabel(POPULATION_INFO, 'Population');
	const land = buildIconLabel(LAND_INFO, 'Land');
	const slot = buildIconLabel(SLOT_INFO, 'Development Slot');
	const passive = buildIconLabel(PASSIVE_INFO, 'Passive');
	const modifiers = buildModifierAssets();
	const phases = buildPhaseAssets(context);
	return Object.freeze({
		resources,
		stats,
		populations,
		population,
		land,
		slot,
		passive,
		modifiers,
		...(phases ? { phases } : {}),
		resourceTransferIcon: RESOURCE_TRANSFER_ICON,
		formatPassiveRemoval,
	});
}

function getAssets(context: TranslationContext): TranslationAssets {
	const legacy = context as LegacyContext;
	if (legacy.assets && typeof legacy.assets === 'object') {
		return legacy.assets;
	}
	const cached = legacyAssetCache.get(context as unknown as object);
	if (cached) {
		return cached;
	}
	const assets = createLegacyAssets(context);
	legacyAssetCache.set(context as unknown as object, assets);
	if (!('assets' in legacy) || legacy.assets === undefined) {
		try {
			Object.defineProperty(legacy, 'assets', {
				configurable: true,
				enumerable: false,
				value: assets,
			});
		} catch (error) {
			legacy.assets = assets;
		}
	}
	return assets;
}

export const signed = (n: number): string => (n >= 0 ? '+' : '');
export const gainOrLose = (n: number): string => (n >= 0 ? 'Gain' : 'Lose');
export const increaseOrDecrease = (n: number): string =>
	n >= 0 ? 'Increase' : 'Decrease';

const normalizeString = (...candidates: Array<string | undefined>): string => {
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.trim().length > 0) {
			return candidate;
		}
	}
	return '';
};

const resolveIconLabel = (
	entry: { icon?: string; label?: string } | undefined,
	fallback: { icon?: string; label?: string } | undefined,
	fallbackLabel: string,
): { icon: string; label: string } => {
	const icon = normalizeString(entry?.icon, fallback?.icon);
	const label = normalizeString(entry?.label, fallback?.label, fallbackLabel);
	return { icon, label };
};

export function resolvePopulationDisplay(
	context: TranslationContext,
	role: string | undefined,
): {
	icon: string;
	label: string;
} {
	const assets = getAssets(context);
	const populationAssets = assets.population;
	const entry = role ? assets.populations[role] : undefined;
	return resolveIconLabel(entry, populationAssets, role ?? 'Population');
}

export function resolveResourceDisplay(
	context: TranslationContext,
	key: string,
): { icon: string; label: string } {
	const entry = getAssets(context).resources[key];
	const icon = normalizeString(entry?.icon, key);
	const label = normalizeString(entry?.label, key);
	return { icon, label };
}

export function resolveStatDisplay(
	context: TranslationContext,
	key: string,
): TranslationStatMetadata & { icon: string; label: string } {
	const entry = getAssets(context).stats[key];
	const icon = normalizeString(entry?.icon, key);
	const label = normalizeString(entry?.label, key);
	const addFormat = entry?.addFormat;
	return { icon, label, ...(addFormat ? { addFormat } : {}) };
}

export function resolveModifierDisplay(
	context: TranslationContext,
	modifierType: string,
): { icon: string; label: string } {
	const entry = getAssets(context).modifiers[modifierType];
	const icon = normalizeString(entry?.icon);
	const label = normalizeString(entry?.label, modifierType);
	return { icon, label };
}

export function resolvePassiveDisplay(context: TranslationContext): {
	icon: string;
	label: string;
} {
	const passiveAssets = getAssets(context).passive;
	const icon = normalizeString(passiveAssets.icon);
	const label = normalizeString(passiveAssets.label, 'Passive');
	return { icon, label };
}

export function resolveResourceTransferIcon(
	context: TranslationContext,
): string {
	return normalizeString(getAssets(context).resourceTransferIcon) || '🔁';
}
