import { LAND_INFO } from '@kingdom-builder/contents';
import { type TranslationDiffContext } from './resourceSources/context';
import {
	formatIconLabel,
	formatLogHeadline,
	LOG_KEYWORDS,
} from './logMessages';
import { type PlayerSnapshot } from './snapshots';

function describeContent(
	registry: { get(id: string): unknown },
	id: string,
): string {
	let name = id;
	let icon = '';
	try {
		const definition = registry.get(id) as
			| { name?: string; icon?: string }
			| undefined;
		if (definition?.name) {
			name = definition.name;
		}
		if (definition?.icon) {
			icon = definition.icon;
		}
	} catch {
		// ignore missing definitions
	}
	const display = [icon, name].filter(Boolean).join(' ').trim();
	return display || name;
}

export function appendBuildingChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: Pick<TranslationDiffContext, 'buildings'>,
): void {
	const previous = new Set(before.buildings);
	const next = new Set(after.buildings);
	for (const id of next) {
		if (previous.has(id)) {
			continue;
		}
		const label = describeContent(context.buildings, id);
		changes.push(formatLogHeadline(LOG_KEYWORDS.built, label));
	}
}

export function appendLandChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: Pick<TranslationDiffContext, 'developments'>,
): void {
	for (const land of after.lands) {
		const previous = before.lands.find((item) => {
			return item.id === land.id;
		});
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
			const label = describeContent(context.developments, development);
			changes.push(formatLogHeadline(LOG_KEYWORDS.developed, label));
		}
	}
}
