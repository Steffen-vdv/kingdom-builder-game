import { type EngineContext, type PlayerId } from '@kingdom-builder/engine';
import { PASSIVE_INFO } from '@kingdom-builder/contents';

import { resolveBuildingIcon } from '../content/buildingIcons';
import { type ResourceSourceEntry } from './metaIcons';

type PassiveDescriptor = {
	icon?: string;
	meta?: { source?: { icon?: string } };
};

type PassiveLookup = {
	evaluationMods?: Map<string, Map<string, unknown>>;
	get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
};

function findBuildingIcon(base: string, context: EngineContext): string {
	const segments = base.split('_');
	for (let index = segments.length; index > 0; index--) {
		const candidate = segments.slice(0, index).join('_');
		const icon = resolveBuildingIcon(candidate, context);
		if (icon) {
			return icon;
		}
	}
	return '';
}

function lookupPassiveIcon(
	base: string,
	passives: PassiveLookup,
	context: EngineContext,
): string {
	const buildingIcon = findBuildingIcon(base, context);
	if (buildingIcon) {
		return buildingIcon;
	}
	if (!passives.get) {
		return PASSIVE_INFO.icon || '';
	}
	const owner = context.activePlayer.id;
	const passive = passives.get(base, owner);
	if (passive?.icon) {
		return passive.icon;
	}
	return passive?.meta?.source?.icon || PASSIVE_INFO.icon || '';
}

export function collectPassiveModifierIcons(
	target: string,
	context: EngineContext,
): string {
	const passives = context.passives as unknown as PassiveLookup;
	const modsMap = passives.evaluationMods?.get(target);
	if (!modsMap) {
		return '';
	}
	const ownerSuffix = `_${context.activePlayer.id}`;
	let icons = '';
	for (const key of modsMap.keys()) {
		if (!key.endsWith(ownerSuffix)) {
			continue;
		}
		const base = key.slice(0, -ownerSuffix.length);
		const icon = lookupPassiveIcon(base, passives, context);
		if (icon) {
			icons += icon;
		}
	}
	return icons;
}

export function appendPassiveIcons(
	entry: ResourceSourceEntry,
	target: string,
	context: EngineContext,
): void {
	const icons = collectPassiveModifierIcons(target, context);
	if (icons) {
		entry.mods += icons;
	}
}
