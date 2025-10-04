/* eslint-disable max-lines */
import { PASSIVE_INFO } from '@kingdom-builder/contents';
import type { EngineContext, StatSourceMeta } from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../translation/content/types';
import {
	formatDependency,
	formatPhaseStep,
	formatTriggerLabel,
} from './descriptors';

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
	const removal = meta.removal
		? formatDependency(meta.removal, player, context, {
				includeCounts: false,
			})
		: undefined;
	const entries: SummaryEntry[] = [];
	buildLongevityEntries(meta, dependencies, removal).forEach((entry) => {
		pushSummaryEntry(entries, entry);
	});
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
		dependencies.forEach((link) => {
			pushSummaryEntry(items, `Triggered by ${link}`);
		});
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
		history.forEach((item) => {
			add(formatHistoryItem(item));
		});
	}
	const triggerLabels = extractTriggerList(extra);
	triggerLabels.forEach((label) => {
		add(`Triggered by ${label}`);
	});
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
			.sort((left, right) => left - right)
			.forEach((turn) => {
				add(phaseHint ? `Turn ${turn} – ${phaseHint}` : `Turn ${turn}`);
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
		[phaseName, stepName].filter((value) => Boolean(value)).join(' · ');
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
