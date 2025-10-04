import { STATS, PASSIVE_INFO } from '@kingdom-builder/contents';
import type {
	EngineContext,
	StatKey,
	StatSourceContribution,
	StatSourceMeta,
} from '@kingdom-builder/engine';
import type { Summary, SummaryEntry } from '../translation/content/types';
import {
	formatDependency,
	formatPhaseStep,
	formatStatValue,
	formatTriggerLabel,
	getSourceDescriptor,
	type SourceDescriptor,
} from './stats/descriptors';

export { formatStatValue, statDisplaysAsPercent } from './stats/descriptors';

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
	annotated.sort((a, b) => {
		const aOrder = a.entry.meta.longevity === 'ongoing' ? 0 : 1;
		const bOrder = b.entry.meta.longevity === 'ongoing' ? 0 : 1;
		if (aOrder !== bOrder) {
			return aOrder - bOrder;
		}
		return a.descriptor.label.localeCompare(b.descriptor.label);
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
	const valueStr = formatStatValue(statKey, amount);
	const sign = amount >= 0 ? '+' : '';
	const amountParts: string[] = [];
	if (statInfo?.icon) {
		amountParts.push(statInfo.icon);
	}
	amountParts.push(`${sign}${valueStr}`);
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
	detailEntries.forEach((entry) => pushSummaryEntry(items, entry));
	return { title, items };
}

function formatSourceTitle(descriptor: SourceDescriptor): string {
	const titleParts: string[] = [];
	if (descriptor.icon) {
		titleParts.push(descriptor.icon);
	}
	const labelParts: string[] = [];
	if (descriptor.label?.trim()) {
		labelParts.push(descriptor.label.trim());
	}
	if (descriptor.suffix?.trim()) {
		labelParts.push(descriptor.suffix.trim());
	}
	if (labelParts.length) {
		const firstLabel = labelParts[0]!;
		const remainingLabels = labelParts.slice(1).join(' · ');
		const labelText = remainingLabels
			? `${firstLabel} · ${remainingLabels}`
			: firstLabel;
		titleParts.push(labelText);
	}

	return titleParts.join(' ').trim();
}

function buildDetailEntries(
	meta: StatSourceMeta,
	player: EngineContext['activePlayer'],
	context: EngineContext,
): SummaryEntry[] {
	const dependencies = (meta.dependsOn ?? [])
		.map((dep) => formatDependency(dep, player, context))
		.filter((text) => text.length > 0);
	const removal = meta.removal
		? formatDependency(meta.removal, player, context, { includeCounts: false })
		: undefined;
	const entries: SummaryEntry[] = [];
	buildLongevityEntries(meta, dependencies, removal).forEach((entry) =>
		pushSummaryEntry(entries, entry),
	);
	buildHistoryEntries(meta).forEach((entry) =>
		pushSummaryEntry(entries, entry),
	);
	return entries;
}

function buildLongevityEntries(
	meta: StatSourceMeta,
	dependencies: string[],
	removal?: string,
): SummaryEntry[] {
	const entries: SummaryEntry[] = [];
	if (meta.longevity === 'ongoing') {
		const items: SummaryEntry[] = [];
		if (!dependencies.length) {
			pushSummaryEntry(items, 'Active at all times');
		} else if (dependencies.length === 1) {
			pushSummaryEntry(items, `While ${dependencies[0]}`);
		} else {
			pushSummaryEntry(items, {
				title: 'While all of:',
				items: dependencies,
			});
		}
		if (removal) {
			pushSummaryEntry(items, `Removed when ${removal}`);
		}
		if (items.length) {
			entries.push({
				title: `${PASSIVE_INFO.icon ?? '♾️'} Ongoing`,
				items,
			});
		} else {
			entries.push(`${PASSIVE_INFO.icon ?? '♾️'} Ongoing`);
		}
		return entries;
	}
	const items: SummaryEntry[] = [];
	if (!dependencies.length) {
		pushSummaryEntry(items, 'Applies immediately and remains in effect');
	} else {
		dependencies.forEach((dep) =>
			pushSummaryEntry(items, `Triggered by ${dep}`),
		);
	}
	if (removal) {
		pushSummaryEntry(items, `Can be removed when ${removal}`);
	}
	if (items.length) {
		entries.push({ title: 'Permanent', items });
	} else {
		entries.push('Permanent');
	}
	return entries;
}

function buildHistoryEntries(meta: StatSourceMeta): SummaryEntry[] {
	const extra = meta.extra;
	if (!extra) {
		return [];
	}
	const entries: SummaryEntry[] = [];
	const seen = new Set<string>();
	const add = (text: string | undefined) => {
		if (!text) {
			return;
		}
		const trimmed = text.trim();
		if (!trimmed || seen.has(trimmed)) {
			return;
		}
		seen.add(trimmed);
		pushSummaryEntry(entries, trimmed);
	};
	const history = extra['history'];
	if (Array.isArray(history)) {
		history.forEach((item) => add(formatHistoryItem(item)));
	}
	const triggerLabels = extractTriggerList(extra);
	triggerLabels.forEach((label) => add(`Triggered by ${label}`));
	const turns = new Set<number>();
	if (typeof extra['turn'] === 'number') {
		turns.add(extra['turn']);
	}
	if (Array.isArray(extra['turns'])) {
		extra['turns'].forEach((value) => {
			if (typeof value === 'number') {
				turns.add(value);
			}
		});
	}
	const phaseHint = formatPhaseStep(
		typeof extra['phase'] === 'string' ? extra['phase'] : undefined,
		typeof extra['step'] === 'string' ? extra['step'] : undefined,
	);
	if (turns.size) {
		Array.from(turns)
			.sort((a, b) => a - b)
			.forEach((turn) => {
				const label = phaseHint
					? `Turn ${turn} – ${phaseHint}`
					: `Turn ${turn}`;
				add(label);
			});
	} else if (phaseHint) {
		add(phaseHint);
	}
	return entries;
}

function extractTriggerList(extra: Record<string, unknown>): string[] {
	const triggers: string[] = [];
	const list = extra['triggers'];
	if (Array.isArray(list)) {
		list.forEach((value) => {
			if (typeof value === 'string') {
				const label = formatTriggerLabel(value);
				if (label) {
					triggers.push(label);
				}
			}
		});
	}
	if (typeof extra['trigger'] === 'string') {
		const label = formatTriggerLabel(extra['trigger']);
		if (label) {
			triggers.push(label);
		}
	}
	return triggers;
}

function formatHistoryItem(entry: unknown): string | undefined {
	if (typeof entry === 'number') {
		return `Turn ${entry}`;
	}
	if (typeof entry === 'string') {
		return entry;
	}
	if (!entry || typeof entry !== 'object') {
		return undefined;
	}
	const record = entry as Record<string, unknown>;
	const turn = typeof record['turn'] === 'number' ? record['turn'] : undefined;
	const phaseId =
		typeof record['phase'] === 'string' ? record['phase'] : undefined;
	const stepId =
		typeof record['step'] === 'string'
			? record['step']
			: typeof record['detail'] === 'string'
				? record['detail']
				: undefined;
	const phaseName =
		typeof record['phaseName'] === 'string' ? record['phaseName'] : undefined;
	const stepName =
		typeof record['stepName'] === 'string' ? record['stepName'] : undefined;
	const phaseText =
		formatPhaseStep(phaseId, stepId) ||
		[phaseName, stepName].filter((part) => Boolean(part)).join(' · ');
	const description =
		typeof record['description'] === 'string'
			? record['description']
			: undefined;
	const parts: string[] = [];
	if (turn !== undefined) {
		parts.push(`Turn ${turn}`);
	}
	if (phaseText) {
		parts.push(phaseText);
	}
	if (description) {
		parts.push(description);
	}
	if (!parts.length) {
		return undefined;
	}
	return parts.join(' – ');
}

function normalizeSummaryEntry(entry: SummaryEntry): SummaryEntry | undefined {
	if (typeof entry === 'string') {
		const trimmed = entry.trim();
		return trimmed.length ? trimmed : undefined;
	}
	const { title, items, ...rest } = entry;
	const normalizedItems = items
		.map((item) => normalizeSummaryEntry(item))
		.filter((item): item is SummaryEntry => Boolean(item));
	const trimmedTitle = title.trim();
	if (!trimmedTitle && !normalizedItems.length) {
		return undefined;
	}
	return {
		title: trimmedTitle || title,
		items: normalizedItems,
		...rest,
	};
}

function pushSummaryEntry(
	target: SummaryEntry[],
	entry: SummaryEntry | undefined,
) {
	if (!entry) {
		return;
	}
	const normalized = normalizeSummaryEntry(entry);
	if (normalized) {
		target.push(normalized);
	}
}
