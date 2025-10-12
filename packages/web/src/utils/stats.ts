import type {
	SessionPlayerStateSnapshot as PlayerStateSnapshot,
	SessionStatSourceContribution as StatSourceContribution,
} from '@kingdom-builder/protocol';
import type { Summary, SummaryEntry } from '../translation/content/types';
import type {
	TranslationContext,
	TranslationIconLabel,
} from '../translation/context';
import {
	formatSourceTitle,
	formatStatValue,
	getSourceDescriptor,
} from './stats/descriptors';
import type { SourceDescriptor } from './stats/descriptors';
import { buildDetailEntries, pushSummaryEntry } from './stats/summary';

export { statDisplaysAsPercent, formatStatValue } from './stats/descriptors';

type StatAssetMap = Readonly<Record<string, TranslationIconLabel>> | undefined;

export function getStatBreakdownSummary(
	statKey: string,
	player: PlayerStateSnapshot,
	context: TranslationContext,
	statAssets?: StatAssetMap,
): Summary {
	const sources = player.statSources?.[statKey] ?? {};
	const contributions = Object.values(sources);
	if (!contributions.length) {
		return [];
	}
	const annotated = contributions.map((entry) => ({
		entry,
		descriptor: getSourceDescriptor(context, entry.meta),
	}));
	const assets = statAssets ?? context.assets.stats;
	annotated.sort((left, right) => {
		const leftOrder = left.entry.meta.longevity === 'ongoing' ? 0 : 1;
		const rightOrder = right.entry.meta.longevity === 'ongoing' ? 0 : 1;
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.descriptor.label.localeCompare(right.descriptor.label);
	});
	return annotated.map(({ entry, descriptor }) =>
		formatContribution(statKey, entry, descriptor, player, context, assets),
	);
}

function formatContribution(
	statKey: string,
	contribution: StatSourceContribution,
	descriptor: SourceDescriptor,
	player: PlayerStateSnapshot,
	context: TranslationContext,
	statAssets: StatAssetMap,
): SummaryEntry {
	const { amount, meta } = contribution;
	const statInfo = statAssets?.[statKey];
	const valueText = formatStatValue(statKey, amount, context.assets);
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
	const detailEntries = buildDetailEntries(meta, player, context, {
		triggerAssets: context.assets.triggers,
	});
	const title = formatSourceTitle(descriptor);
	const prefixedTitle = title ? `Source: ${title}` : 'Source';
	if (!title) {
		const items: SummaryEntry[] = [];
		pushSummaryEntry(items, amountEntry);
		detailEntries.forEach((entry) => {
			pushSummaryEntry(items, entry);
		});
		if (!items.length) {
			return prefixedTitle;
		}
		return { title: prefixedTitle, items };
	}
	const items: SummaryEntry[] = [];
	pushSummaryEntry(items, amountEntry);
	detailEntries.forEach((entry) => {
		pushSummaryEntry(items, entry);
	});
	return { title: prefixedTitle, items };
}
