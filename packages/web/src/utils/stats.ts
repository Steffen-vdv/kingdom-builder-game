import { STATS } from '@kingdom-builder/contents';
import type {
	EngineContext,
	StatKey,
	StatSourceContribution,
} from '@kingdom-builder/engine';
import type { Summary, SummaryEntry } from '../translation/content/types';
import {
	formatSourceTitle,
	formatStatValue,
	getSourceDescriptor,
} from './stats/descriptors';
import type { SourceDescriptor } from './stats/descriptors';
import { buildDetailEntries, pushSummaryEntry } from './stats/summary';

export { statDisplaysAsPercent, formatStatValue } from './stats/descriptors';

function isStatKey(key: string): key is StatKey {
	return key in STATS;
}

export function getStatBreakdownSummary(
	statKey: string,
	player: EngineContext['activePlayer'],
	context: EngineContext,
): Summary {
	if (!isStatKey(statKey)) {
		return [];
	}
	const sources = player.statSources?.[statKey] ?? {};
	const contributions = Object.values(sources);
	if (!contributions.length) {
		return [];
	}
	const annotated = contributions.map((entry) => ({
		entry,
		descriptor: getSourceDescriptor(entry.meta),
	}));
	annotated.sort((left, right) => {
		const leftOrder = left.entry.meta.longevity === 'ongoing' ? 0 : 1;
		const rightOrder = right.entry.meta.longevity === 'ongoing' ? 0 : 1;
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.descriptor.label.localeCompare(right.descriptor.label);
	});
	return annotated.map(({ entry, descriptor }) =>
		formatContribution(statKey, entry, descriptor, player, context),
	);
}

function formatContribution(
	statKey: string,
	contribution: StatSourceContribution,
	descriptor: SourceDescriptor,
	player: EngineContext['activePlayer'],
	context: EngineContext,
): SummaryEntry {
	const { amount, meta } = contribution;
	const statInfo = STATS[statKey as keyof typeof STATS];
	const valueText = formatStatValue(statKey, amount);
	const sign = amount >= 0 ? '+' : '';
	const amountParts: string[] = [];
	if (statInfo?.icon) {
		amountParts.push(statInfo.icon);
	}
	amountParts.push(`${sign}${valueText}`);
	if (statInfo?.label) {
		amountParts.push(statInfo.label);
	}
	const amountEntry = amountParts.join(' ').trim();
	const detailEntries = buildDetailEntries(meta, player, context);
	const title = formatSourceTitle(descriptor);
	if (!title) {
		if (!detailEntries.length) {
			return amountEntry;
		}
		return { title: amountEntry, items: detailEntries };
	}
	const items: SummaryEntry[] = [];
	pushSummaryEntry(items, amountEntry);
	detailEntries.forEach((entry) => {
		pushSummaryEntry(items, entry);
	});
	return { title, items };
}
