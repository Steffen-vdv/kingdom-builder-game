import type { TranslationContext } from '../../../context';
import { humanizeIdentifier } from '../../stringUtils';

export type AttackRegistryDescriptor = { icon: string; label: string };

function coerceLabel(value: string | undefined, fallback: string): string {
	if (!value) {
		return fallback;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}

function resolveIcon(icon: string | undefined): string {
	const trimmed = icon?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : '';
}

export function selectAttackResourceDescriptor(
	context: TranslationContext,
	resourceKey: string,
): AttackRegistryDescriptor {
	const entry = context.assets.resources?.[resourceKey];
	const fallbackLabel = humanizeIdentifier(resourceKey) || resourceKey;
	return {
		icon: resolveIcon(entry?.icon),
		label: coerceLabel(entry?.label, fallbackLabel),
	};
}

export function selectAttackBuildingDescriptor(
	context: TranslationContext,
	buildingId: string,
): AttackRegistryDescriptor {
	try {
		const definition = context.buildings.get(buildingId);
		const labelFallback =
			humanizeIdentifier(buildingId) || definition.name || buildingId;
		return {
			icon: resolveIcon(definition.icon),
			label: coerceLabel(definition.name, labelFallback),
		};
	} catch {
		const fallbackLabel = humanizeIdentifier(buildingId) || buildingId;
		return { icon: '', label: fallbackLabel };
	}
}

export function selectAttackStatDescriptor(
	context: TranslationContext,
	statKey: string,
): AttackRegistryDescriptor {
	const entry = context.assets.stats?.[statKey];
	const fallbackLabel = humanizeIdentifier(statKey) || statKey;
	return {
		icon: resolveIcon(entry?.icon),
		label: coerceLabel(entry?.label, fallbackLabel),
	};
}

export function selectAttackDefaultStatKey(
	context: TranslationContext,
): string | undefined {
	const statEntries = context.assets.stats;
	const keys = Object.keys(statEntries ?? {});
	if (keys.length > 0) {
		return keys[0];
	}
	const playerStatKeys = Object.keys(context.activePlayer.stats ?? {});
	if (playerStatKeys.length > 0) {
		return playerStatKeys[0];
	}
	const opponentStatKeys = Object.keys(context.opponent.stats ?? {});
	if (opponentStatKeys.length > 0) {
		return opponentStatKeys[0];
	}
	return undefined;
}
