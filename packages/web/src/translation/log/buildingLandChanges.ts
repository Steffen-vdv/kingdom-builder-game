import { type EngineContext } from '@kingdom-builder/engine';
import { LAND_INFO } from '@kingdom-builder/contents';
import { logContent } from '../content';
import {
	formatIconLabel,
	formatLogHeadline,
	LOG_KEYWORDS,
} from './logMessages';
import { type PlayerSnapshot } from './snapshots';

export function appendBuildingChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
): void {
	const previous = new Set(before.buildings);
	const next = new Set(after.buildings);
	for (const id of next) {
		if (previous.has(id)) {
			continue;
		}
		const label = logContent('building', id, context)[0] ?? id;
		changes.push(formatLogHeadline(LOG_KEYWORDS.built, label));
	}
}

export function appendLandChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
): void {
	for (const land of after.lands) {
		const previous = before.lands.find((item) => item.id === land.id);
		if (!previous) {
			const landLabel =
				formatIconLabel(LAND_INFO.icon, LAND_INFO.label) ||
				LAND_INFO.label ||
				'Land';
			changes.push(formatLogHeadline(LOG_KEYWORDS.gained, landLabel));
			continue;
		}
		for (const development of land.developments) {
			if (previous.developments.includes(development)) {
				continue;
			}
			const info = logContent('development', development, context);
			const label = info[0] ?? development;
			changes.push(formatLogHeadline(LOG_KEYWORDS.developed, label));
		}
	}
}
