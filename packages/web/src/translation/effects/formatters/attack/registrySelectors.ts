import { humanizeIdentifier } from '../../stringUtils';
import {
	selectResourceDescriptor,
	selectStatDescriptor,
} from '../../registrySelectors';
import type { TranslationContext } from '../../../context';

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

function fallbackLabel(id: string): string {
	const humanized = humanizeIdentifier(id);
	return humanized && humanized.length > 0 ? humanized : id;
}

export function selectAttackResourceDescriptor(
	context: TranslationContext,
	resourceKey: string,
): AttackRegistryDescriptor {
	const descriptor = selectResourceDescriptor(context, resourceKey);
	return {
		icon: coerceIcon(descriptor.icon),
		label: coerceLabel(descriptor.label, fallbackLabel(resourceKey)),
	};
}

export function selectAttackStatDescriptor(
	context: TranslationContext,
	statKey: string,
): AttackRegistryDescriptor {
	const descriptor = selectStatDescriptor(context, statKey);
	return {
		icon: coerceIcon(descriptor.icon),
		label: coerceLabel(descriptor.label, fallbackLabel(statKey)),
	};
}

export function selectAttackBuildingDescriptor(
	context: TranslationContext,
	buildingId: string,
): AttackRegistryDescriptor {
	try {
		const definition = context.buildings.get(buildingId);
		const label = coerceLabel(definition.name, fallbackLabel(buildingId));
		const icon = coerceIcon(definition.icon as string | undefined);
		return { icon, label };
	} catch {
		return { icon: '', label: fallbackLabel(buildingId) };
	}
}

function firstKey(record: Readonly<Record<string, unknown>> | undefined) {
	if (!record) {
		return undefined;
	}
	const keys = Object.keys(record);
	return keys.length > 0 ? keys[0] : undefined;
}

export function selectAttackDefaultResourceKey(
	context: TranslationContext,
): string | undefined {
	return firstKey(context.assets.resources);
}

export function selectAttackDefaultStatKey(
	context: TranslationContext,
): string | undefined {
	const stats = context.assets.stats;
	if (stats?.armyStrength) {
		return 'armyStrength';
	}
	return firstKey(stats);
}
