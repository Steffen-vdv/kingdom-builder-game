import type {
	SessionPlayerStateSnapshot,
	SessionStatSourceContribution,
} from '@kingdom-builder/protocol';
import type { Summary, SummaryEntry } from '../translation/content/types';
import type { TranslationContext } from '../translation/context';
import {
	formatSourceTitle,
	formatStatValue,
	getSourceDescriptor,
} from './stats/descriptors';
import type { SourceDescriptor } from './stats/descriptors';
import { buildDetailEntries, pushSummaryEntry } from './stats/summary';
import type { RegistryMetadataDescriptor } from '../contexts/registryMetadataDescriptors';
import type { MetadataSelector } from '../contexts/registryMetadataSelectors';

export { statDisplaysAsPercent, formatStatValue } from './stats/descriptors';

type StatMetadataSelector = Pick<
	MetadataSelector<RegistryMetadataDescriptor>,
	'select'
>;

export function getStatBreakdownSummary(
	statKey: string,
	player: SessionPlayerStateSnapshot,
	context: TranslationContext,
	statMetadata: StatMetadataSelector,
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
	annotated.sort((left, right) => {
		const leftOrder = left.entry.meta.longevity === 'ongoing' ? 0 : 1;
		const rightOrder = right.entry.meta.longevity === 'ongoing' ? 0 : 1;
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.descriptor.label.localeCompare(right.descriptor.label);
	});
	return annotated.map(({ entry, descriptor }) =>
		formatContribution(
			statKey,
			entry,
			descriptor,
			player,
			context,
			statMetadata,
		),
	);
}

function formatContribution(
	statKey: string,
	contribution: SessionStatSourceContribution,
	descriptor: SourceDescriptor,
	player: SessionPlayerStateSnapshot,
	context: TranslationContext,
	statMetadata: StatMetadataSelector,
): SummaryEntry {
	const { amount, meta } = contribution;
	const statInfo = context.assets.stats?.[statKey];
	const statDescriptor = statMetadata.select(statKey);
	const valueText = formatStatValue(statKey, amount, context.assets);
	const sign = amount >= 0 ? '+' : '';
	const amountParts: string[] = [];
	const icon = statInfo?.icon ?? statDescriptor.icon;
	if (icon) {
		amountParts.push(icon);
	}
	amountParts.push(`${sign}${valueText}`);
	const label = statInfo?.label ?? statDescriptor.label;
	if (label) {
		amountParts.push(label);
	}
	const amountEntry = amountParts.join(' ').trim();
	const detailEntries = buildDetailEntries(meta, player, context);
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
