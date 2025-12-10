import type { SessionResourceSourceMeta as ResourceSourceMeta } from '@kingdom-builder/protocol';
import type { SummaryEntry } from '../../translation/content/types';
import type { TranslationTriggerAsset } from '../../translation/context';
import { formatPhaseStep } from './format';

type HistoryFormattingOptions = {
	triggerAssets?: Readonly<Record<string, TranslationTriggerAsset>>;
};

export function buildHistoryEntries(
	meta: ResourceSourceMeta,
	options: HistoryFormattingOptions = {},
): SummaryEntry[] {
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
		entries.push(trimmed);
	};
	const history = extra['history'];
	if (Array.isArray(history)) {
		history.forEach((item) => {
			add(formatHistoryItem(item));
		});
	}
	const triggerLabels = extractTriggerList(extra, options.triggerAssets);
	triggerLabels.forEach((label) => {
		add(`Triggered by ${label}`);
	});
	const turns = collectTurns(extra);
	const phaseHint = formatPhaseStep(
		typeof extra['phase'] === 'string' ? extra['phase'] : undefined,
		typeof extra['step'] === 'string' ? extra['step'] : undefined,
	);
	if (turns.length) {
		turns
			.sort((left, right) => left - right)
			.forEach((turn) => {
				add(phaseHint ? `Turn ${turn} – ${phaseHint}` : `Turn ${turn}`);
			});
	} else if (phaseHint) {
		add(phaseHint);
	}
	return entries;
}

function collectTurns(extra: Record<string, unknown>): number[] {
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
	return Array.from(turns);
}

function extractTriggerList(
	extra: Record<string, unknown>,
	triggerAssets?: Readonly<Record<string, TranslationTriggerAsset>>,
): string[] {
	const triggers: string[] = [];
	const list = extra['triggers'];
	if (Array.isArray(list)) {
		list.forEach((value) => {
			if (typeof value === 'string') {
				const label = formatTriggerAssetLabel(value, triggerAssets);
				if (label) {
					triggers.push(label);
				}
			}
		});
	}
	if (typeof extra['trigger'] === 'string') {
		const label = formatTriggerAssetLabel(extra['trigger'], triggerAssets);
		if (label) {
			triggers.push(label);
		}
	}
	return triggers;
}

function formatTriggerAssetLabel(
	id: string,
	triggerAssets?: Readonly<Record<string, TranslationTriggerAsset>>,
): string | undefined {
	if (!id) {
		return undefined;
	}
	const asset = triggerAssets?.[id];
	const icon = asset?.icon ?? '';
	const label = asset?.label ?? asset?.past ?? asset?.future ?? '';
	const parts: string[] = [];
	if (icon.trim()) {
		parts.push(icon.trim());
	}
	if (label.trim()) {
		parts.push(label.trim());
	}
	const formatted = parts.join(' ').trim();
	if (formatted) {
		return formatted;
	}
	return id.trim() || undefined;
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
