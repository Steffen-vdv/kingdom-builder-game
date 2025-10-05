import type { EngineContext, StatSourceMeta } from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../translation/content/types';
import { formatDependency } from './dependencyFormatters';
import { buildHistoryEntries } from './historyEntries';
import { buildLongevityEntries } from './passiveFormatting';

type SummaryGroup = Exclude<SummaryEntry, string>;

type SummaryGroupExtras = { _desc?: true; _hoist?: true };

function isSummaryGroup(entry: SummaryEntry): entry is SummaryGroup {
	return typeof entry !== 'string';
}

export function buildDetailEntries(
	meta: StatSourceMeta,
	player: EngineContext['activePlayer'],
	context: EngineContext,
): SummaryEntry[] {
	const dependencies = (meta.dependsOn ?? [])
		.map((link) => formatDependency(link, player, context))
		.filter((text) => text.length > 0);
	const removalLink = meta.removal;
	const removal = removalLink
		? formatDependency(removalLink, player, context, {
				includeCounts: false,
			})
		: undefined;
	const entries: SummaryEntry[] = [];
	buildLongevityEntries(meta, dependencies, removal, removalLink).forEach(
		(entry) => {
			pushSummaryEntry(entries, entry);
		},
	);
	buildHistoryEntries(meta).forEach((entry) => {
		pushSummaryEntry(entries, entry);
	});
	return entries;
}

export function pushSummaryEntry(target: SummaryEntry[], entry?: SummaryEntry) {
	if (!entry) {
		return;
	}
	const normalized = normalizeSummaryEntry(entry);
	if (normalized) {
		target.push(normalized);
	}
}

function normalizeSummaryEntry(entry: SummaryEntry): SummaryEntry | undefined {
	if (typeof entry === 'string') {
		const trimmed = entry.trim();
		return trimmed.length ? trimmed : undefined;
	}
	if (!isSummaryGroup(entry)) {
		return undefined;
	}
	return normalizeSummaryGroup(entry);
}

function normalizeSummaryGroup(entry: SummaryGroup): SummaryEntry | undefined {
	const normalizedItems = entry.items
		.map((item: SummaryEntry) => normalizeSummaryEntry(item))
		.filter((item: SummaryEntry | undefined): item is SummaryEntry =>
			Boolean(item),
		);
	const trimmedTitle = entry.title.trim();
	if (!trimmedTitle && !normalizedItems.length) {
		return undefined;
	}
	const extras: SummaryGroupExtras = {};
	if (entry._desc) {
		extras._desc = true;
	}
	if (entry._hoist) {
		extras._hoist = true;
	}
	return {
		title: trimmedTitle || entry.title,
		items: normalizedItems,
		...extras,
	};
}
