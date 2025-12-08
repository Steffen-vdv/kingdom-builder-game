import type { TranslationContext } from '../../../context';
import { humanizeIdentifier } from '../../stringUtils';

export type AttackRegistryDescriptor = { icon: string; label: string };

type ResourceMetadataCarrier = {
	resourceMetadata?: {
		get?: (id: string) => { icon?: string; label?: string } | undefined;
		list?: () => ReadonlyArray<{ id: string }>;
	};
};

type BuildingCarrier = Pick<TranslationContext, 'buildings'>;

function coerceString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function coerceLabel(value: unknown, fallback: string): string {
	return coerceString(value) ?? fallback;
}

function coerceIcon(value: unknown): string {
	return coerceString(value) ?? '';
}

function freezeKeys<T extends string>(keys: string[]): ReadonlyArray<T> {
	return Object.freeze(keys) as ReadonlyArray<T>;
}

export function selectAttackResourceDescriptor(
	context: ResourceMetadataCarrier,
	resourceKey: string,
): AttackRegistryDescriptor {
	const entry = context.resourceMetadata?.get?.(resourceKey);
	const label = coerceLabel(
		entry?.label,
		humanizeIdentifier(resourceKey) || resourceKey,
	);
	const icon = coerceIcon(entry?.icon);
	return { icon, label };
}

export function selectAttackStatDescriptor(
	context: ResourceMetadataCarrier,
	statKey: string,
): AttackRegistryDescriptor {
	// Stats are unified with resources in Resource
	const entry = context.resourceMetadata?.get?.(statKey);
	const fallbackLabel = humanizeIdentifier(statKey) || statKey;
	const label = coerceLabel(entry?.label, fallbackLabel);
	const icon = coerceIcon(entry?.icon);
	return { icon, label };
}

export function selectAttackBuildingDescriptor(
	context: BuildingCarrier,
	buildingId: string,
): AttackRegistryDescriptor {
	const fallback: AttackRegistryDescriptor = {
		icon: '',
		label: buildingId,
	};
	try {
		const definition = context.buildings.get(buildingId);
		const label = coerceLabel(definition?.name, buildingId);
		const icon = coerceIcon(definition?.icon);
		const descriptor: AttackRegistryDescriptor = { icon, label };
		return descriptor;
	} catch {
		return fallback;
	}
}

export function listAttackResourceKeys(
	context: ResourceMetadataCarrier,
): ReadonlyArray<string> {
	const entries = context.resourceMetadata?.list?.() ?? [];
	return freezeKeys(entries.map((entry) => entry.id));
}
