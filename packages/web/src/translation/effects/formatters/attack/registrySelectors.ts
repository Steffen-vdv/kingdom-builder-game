import type { TranslationContext } from '../../../context';
import {
	selectResourceDescriptor,
	selectStatDescriptor,
} from '../../registrySelectors';
import { humanizeIdentifier } from '../../stringUtils';

export type AttackRegistryDescriptor = { icon: string; label: string };

function normalizeDescriptor(
	descriptor: { icon: string; label: string },
	fallback: string,
): AttackRegistryDescriptor {
	const icon = descriptor.icon?.trim() ?? '';
	const baseLabel = descriptor.label?.trim() ?? '';
	const label = baseLabel.length > 0 ? baseLabel : fallback;
	return { icon, label };
}

export function selectAttackResourceDescriptor(
	context: TranslationContext,
	resourceKey: string,
): AttackRegistryDescriptor {
	const descriptor = selectResourceDescriptor(context, resourceKey);
	return normalizeDescriptor(descriptor, resourceKey);
}

export function selectAttackStatDescriptor(
	context: TranslationContext,
	statKey: string,
): AttackRegistryDescriptor {
	const descriptor = selectStatDescriptor(context, statKey);
	return normalizeDescriptor(descriptor, statKey);
}

export function selectAttackBuildingDescriptor(
	context: TranslationContext,
	buildingId: string,
): AttackRegistryDescriptor {
	let icon = '';
	let label = humanizeIdentifier(buildingId) || buildingId;
	try {
		if (context.buildings.has(buildingId)) {
			const definition = context.buildings.get(buildingId);
			if (typeof definition.icon === 'string') {
				icon = definition.icon;
			}
			if (
				typeof definition.name === 'string' &&
				definition.name.trim().length > 0
			) {
				label = definition.name;
			}
		}
	} catch {
		/* ignore missing building definitions */
	}
	return { icon, label };
}

export function listAttackResourceKeys(
	context: TranslationContext,
): ReadonlyArray<string> {
	return Object.freeze(Object.keys(context.assets.resources));
}

export function listAttackStatKeys(
	context: TranslationContext,
): ReadonlyArray<string> {
	return Object.freeze(Object.keys(context.assets.stats));
}

export function selectAttackDefaultStatKey(
	context: TranslationContext,
): string | undefined {
	const keys = Object.keys(context.assets.stats);
	return keys.length > 0 ? keys[0] : undefined;
}
