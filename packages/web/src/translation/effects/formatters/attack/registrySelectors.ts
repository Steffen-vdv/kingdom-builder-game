import {
	selectResourceDisplay,
	selectStatDisplay,
} from '../../../context/assetSelectors';
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

function deriveKeysFromRecords(
	record: Readonly<Record<string, unknown>> | undefined,
): string[] {
	if (!record) {
		return [];
	}
	return Object.keys(record);
}

function collectPlayerKeys(players: Array<Record<string, number>>): string[] {
	const allKeys = new Set<string>();
	for (const player of players) {
		for (const key of Object.keys(player)) {
			allKeys.add(key);
		}
	}
	return Array.from(allKeys);
}

function uniqueKeys(...sources: string[][]): string[] {
	const seen = new Set<string>();
	for (const list of sources) {
		for (const key of list) {
			if (!seen.has(key)) {
				seen.add(key);
			}
		}
	}
	return Array.from(seen);
}

export function selectAttackResourceDescriptor(
	translation: TranslationContext,
	resourceKey: string,
): AttackRegistryDescriptor {
	const display = selectResourceDisplay(translation.assets, resourceKey);
	return toDescriptor(display.label, display.icon, resourceKey);
}

export function selectAttackStatDescriptor(
	translation: TranslationContext,
	statKey: string,
): AttackRegistryDescriptor {
	const display = selectStatDisplay(translation.assets, statKey);
	return toDescriptor(display.label, display.icon, statKey);
}

export function selectAttackBuildingDescriptor(
	translation: TranslationContext,
	buildingId: string,
): AttackRegistryDescriptor {
	try {
		const definition = translation.buildings.get(buildingId);
		return toDescriptor(definition.name, definition.icon, buildingId);
	} catch {
		return { icon: '', label: buildingId };
	}
}

export function listAttackResourceKeys(
	translation: TranslationContext,
): ReadonlyArray<string> {
	const assetKeys = deriveKeysFromRecords(translation.assets?.resources);
	const playerKeys = collectPlayerKeys([
		translation.activePlayer.resources,
		translation.opponent.resources,
	]);
	return Object.freeze(uniqueKeys(assetKeys, playerKeys));
}

export function selectAttackDefaultResourceKey(
	translation: TranslationContext,
): string | undefined {
	const keys = listAttackResourceKeys(translation);
	return keys.length > 0 ? keys[0] : undefined;
}

export function listAttackStatKeys(
	translation: TranslationContext,
): ReadonlyArray<string> {
	const assetKeys = deriveKeysFromRecords(translation.assets?.stats);
	const playerKeys = collectPlayerKeys([
		translation.activePlayer.stats,
		translation.opponent.stats,
	]);
	return Object.freeze(uniqueKeys(assetKeys, playerKeys));
}

export function selectAttackDefaultStatKey(
	translation: TranslationContext,
): string | undefined {
	const keys = listAttackStatKeys(translation);
	return keys.length > 0 ? keys[0] : undefined;
}
