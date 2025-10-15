import { type ResourceKey, type StatKey } from '@kingdom-builder/contents';
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

function toDescriptor(
	label: string | undefined,
	icon: string | undefined,
	fallback: string,
): AttackRegistryDescriptor {
	return {
		icon: coerceIcon(icon),
		label: coerceLabel(label, fallback),
	};
}

export function selectAttackResourceDescriptor(
        context: TranslationContext,
        resourceKey: string,
): AttackRegistryDescriptor {
        const entry = context.assets.resources?.[resourceKey];
        return toDescriptor(entry?.label, entry?.icon, resourceKey);
}

export function selectAttackStatDescriptor(
        context: TranslationContext,
        statKey: string,
): AttackRegistryDescriptor {
        const entry = context.assets.stats?.[statKey];
        return toDescriptor(entry?.label, entry?.icon, statKey);
}

export function selectAttackBuildingDescriptor(
        context: TranslationContext,
        buildingId: string,
): AttackRegistryDescriptor {
        try {
                const definition = context.buildings.get(buildingId);
                return toDescriptor(definition.name, definition.icon, buildingId);
        } catch {
                return { icon: '', label: buildingId };
        }
}
