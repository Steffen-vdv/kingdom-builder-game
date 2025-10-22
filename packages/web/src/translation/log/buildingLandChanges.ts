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
	context: Pick<TranslationDiffContext, 'developments' | 'assets'>,
): void {
	const landLabelBase =
		formatIconLabel(context.assets.land.icon, context.assets.land.label) ||
		context.assets.land.label ||
		'Land';
	const startingLandCount = before.lands.length;
	let gainedLandCount = 0;
	for (const land of after.lands) {
		const previous = before.lands.find((item) => {
			return item.id === land.id;
		});
		if (!previous) {
			const previousCount = startingLandCount + gainedLandCount;
			const newCount = previousCount + 1;
			const summary = `${landLabelBase} +1 (${previousCount}→${newCount})`;
			changes.push(summary);
			gainedLandCount += 1;
			continue;
		}
		for (const development of land.developments) {
			if (previous.developments.includes(development)) {
				continue;
			}
			const label = describeContent(context.developments, development);
			const slotIcon = context.assets.slot.icon?.trim() ?? '';
			const slotLabel = context.assets.slot.label?.trim() ?? 'Development Slot';
			const emptySlotLabel = `Empty ${slotLabel}`.trim();
			const slotDisplay = [slotIcon, emptySlotLabel]
				.filter(Boolean)
				.join(' ')
				.trim();
			const headline = formatLogHeadline(LOG_KEYWORDS.developed, label);
			const summary = slotDisplay ? `${headline} on ${slotDisplay}` : headline;
			changes.push(summary);
		}
	}
}
