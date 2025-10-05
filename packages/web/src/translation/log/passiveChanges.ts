import { PASSIVE_INFO } from '@kingdom-builder/contents';
import { resolvePassivePresentation } from './passives';
import type { PlayerSnapshot } from './snapshots';

function createPassiveMap(passives: PlayerSnapshot['passives']) {
	const map = new Map<string, PlayerSnapshot['passives'][number]>();
	for (const passive of passives) {
		map.set(passive.id, passive);
	}
	return map;
}

function isBuildingPassive(
	passiveId: string,
	newBuildings: Set<string>,
): boolean {
	for (const buildingId of newBuildings) {
		if (passiveId === buildingId || passiveId.startsWith(`${buildingId}_`)) {
			return true;
		}
	}
	return false;
}

function collectDevelopmentPassiveIds(
	lands: PlayerSnapshot['lands'],
): Set<string> {
	const ids = new Set<string>();
	for (const land of lands) {
		for (const development of land.developments) {
			ids.add(`${development}_${land.id}`);
		}
	}
	return ids;
}

function collectAddedDevelopmentPassives(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): Set<string> {
	const previous = collectDevelopmentPassiveIds(before.lands);
	const next = collectDevelopmentPassiveIds(after.lands);
	const additions = new Set<string>();
	for (const id of next) {
		if (!previous.has(id)) {
			additions.add(id);
		}
	}
	return additions;
}

function collectRemovedDevelopmentPassives(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): Set<string> {
	const previous = collectDevelopmentPassiveIds(before.lands);
	const next = collectDevelopmentPassiveIds(after.lands);
	const removals = new Set<string>();
	for (const id of previous) {
		if (!next.has(id)) {
			removals.add(id);
		}
	}
	return removals;
}

function decoratePassiveLabel(icon: string, label: string): string {
	const fallback = label.trim() || PASSIVE_INFO.label || label;
	const decorated = [icon, fallback]
		.filter((part) => part && String(part).trim().length > 0)
		.join(' ')
		.trim();
	const prefix = PASSIVE_INFO.icon?.trim();
	if (!prefix) {
		return decorated;
	}
	return decorated.length ? `${prefix} ${decorated}` : prefix;
}

export function appendPassiveChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
) {
	const previous = createPassiveMap(before.passives);
	const next = createPassiveMap(after.passives);
	const previousBuildings = new Set(before.buildings);
	const newBuildings = new Set(
		after.buildings.filter((id) => !previousBuildings.has(id)),
	);
	const addedDevelopmentPassives = collectAddedDevelopmentPassives(
		before,
		after,
	);
	const removedDevelopmentPassives = collectRemovedDevelopmentPassives(
		before,
		after,
	);
	for (const [id, passive] of next) {
		if (previous.has(id)) {
			continue;
		}
		if (isBuildingPassive(id, newBuildings)) {
			continue;
		}
		if (addedDevelopmentPassives.has(id)) {
			continue;
		}
		const { icon, label } = resolvePassivePresentation(passive);
		const decoratedLabel = decoratePassiveLabel(icon, label);
		changes.push(`${decoratedLabel} activated`);
	}
	for (const [id, passive] of previous) {
		if (next.has(id)) {
			continue;
		}
		if (removedDevelopmentPassives.has(id)) {
			continue;
		}
		const { icon, label } = resolvePassivePresentation(passive);
		const decoratedLabel = decoratePassiveLabel(icon, label);
		changes.push(`${decoratedLabel} deactivated`);
	}
}
