import {
	BUILDINGS,
	RESOURCES,
	STATS,
	type ResourceKey,
	type StatKey,
} from '@kingdom-builder/contents';
import type { TranslationContext } from '../../../context/types';
import { humanizeIdentifier } from '../../stringUtils';

export type AttackRegistryDescriptor = { icon: string; label: string };

function coerceLabel(value: string | undefined, fallback: string): string {
	if (!value) {
		return fallback;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}

function coerceIcon(icon: string | undefined): string {
	return icon ? icon : '';
}

function toDescriptor(
	label: string | undefined,
	icon: string | undefined,
	fallback: string,
): AttackRegistryDescriptor {
	const fallbackLabel = humanizeIdentifier(fallback) || fallback;
	return {
		icon: coerceIcon(icon),
		label: coerceLabel(label, fallbackLabel),
	};
}

export function selectAttackResourceDescriptor(
	resourceKey: string,
): AttackRegistryDescriptor {
	const definition = RESOURCES[resourceKey as ResourceKey];
	return toDescriptor(definition?.label, definition?.icon, resourceKey);
}

export function selectAttackStatDescriptor(
	statKey: string,
): AttackRegistryDescriptor {
	const definition = STATS[statKey as StatKey];
	return toDescriptor(definition?.label, definition?.icon, statKey);
}

export function selectAttackBuildingDescriptor(
	buildingId: string,
): AttackRegistryDescriptor {
	try {
		const definition = BUILDINGS.get(buildingId);
		return toDescriptor(definition.name, definition.icon, buildingId);
	} catch {
		return toDescriptor(undefined, undefined, buildingId);
	}
}

export function listAttackResourceKeys(): ReadonlyArray<ResourceKey> {
	return Object.freeze(Object.keys(RESOURCES) as ReadonlyArray<ResourceKey>);
}

export function listAttackStatKeys(): ReadonlyArray<StatKey> {
	return Object.freeze(Object.keys(STATS) as ReadonlyArray<StatKey>);
}

export function listAttackBuildingIds(): ReadonlyArray<string> {
	return Object.freeze(BUILDINGS.keys().slice());
}

export function selectAttackDefaultStatKey(): StatKey | undefined {
	const keys = listAttackStatKeys();
	return keys.length > 0 ? keys[0] : undefined;
}

export function selectAttackDefaultBuildingId(): string | undefined {
	const ids = listAttackBuildingIds();
	return ids.length > 0 ? ids[0] : undefined;
}

export function withAttackTranslationContext<T>(
	_context: TranslationContext,
	run: () => T,
): T {
	return run();
}
