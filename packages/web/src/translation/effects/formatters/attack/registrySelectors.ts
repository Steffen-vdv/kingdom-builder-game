import type { TranslationContext } from '../../../context';

export type AttackRegistryDescriptor = { icon: string; label: string };

type ResourceMetadataCarrier = {
	resourceMetadata?: {
		get?: (id: string) => { icon?: string; label?: string } | undefined;
		list?: () => ReadonlyArray<{ id: string }>;
	};
};

type BuildingCarrier = Pick<TranslationContext, 'buildings'>;

function coerceString(value: unknown): string {
	if (typeof value !== 'string') {
		return '';
	}
	return value.trim();
}

function freezeKeys<T extends string>(keys: string[]): ReadonlyArray<T> {
	return Object.freeze(keys) as ReadonlyArray<T>;
}

/**
 * Returns resource descriptor from content metadata.
 * No fallbacks - content must provide label and icon.
 */
export function selectAttackResourceDescriptor(
	context: ResourceMetadataCarrier,
	resourceKey: string,
): AttackRegistryDescriptor {
	const entry = context.resourceMetadata?.get?.(resourceKey);
	return {
		icon: coerceString(entry?.icon),
		label: coerceString(entry?.label),
	};
}

/**
 * Returns stat descriptor from content metadata.
 * No fallbacks - content must provide label and icon.
 */
export function selectAttackStatDescriptor(
	context: ResourceMetadataCarrier,
	statKey: string,
): AttackRegistryDescriptor {
	const entry = context.resourceMetadata?.get?.(statKey);
	return {
		icon: coerceString(entry?.icon),
		label: coerceString(entry?.label),
	};
}

/**
 * Returns building descriptor from content registry.
 * No fallbacks - content must provide name and icon.
 */
export function selectAttackBuildingDescriptor(
	context: BuildingCarrier,
	buildingId: string,
): AttackRegistryDescriptor {
	const definition = context.buildings.get(buildingId);
	return {
		icon: coerceString(definition?.icon),
		label: coerceString(definition?.name),
	};
}

export function listAttackResourceKeys(
	context: ResourceMetadataCarrier,
): ReadonlyArray<string> {
	const entries = context.resourceMetadata?.list?.() ?? [];
	return freezeKeys(entries.map((entry) => entry.id));
}
