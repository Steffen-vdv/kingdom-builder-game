import { PASSIVE_INFO } from '@kingdom-builder/contents';
import { resolvePassivePresentation } from './passives';
import type { PlayerSnapshot } from './snapshots';

function createPassiveMap(passives: PlayerSnapshot['passives']) {
	return new Map(passives.map((passive) => [passive.id, passive]));
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
	for (const [id, passive] of next) {
		if (previous.has(id)) {
			continue;
		}
		if (isBuildingPassive(id, newBuildings)) {
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
		const { icon, label } = resolvePassivePresentation(passive);
		const decoratedLabel = decoratePassiveLabel(icon, label);
		changes.push(`${decoratedLabel} deactivated`);
	}
}
