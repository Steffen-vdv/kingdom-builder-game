import type { AdvanceSkip } from '@kingdom-builder/engine';

type PhaseLike = {
	id: string;
	label?: string;
	icon?: string;
};

type StepLike = {
	id: string;
	title?: string;
	icon?: string;
};

type HistoryItem = { text: string; italic?: boolean };

type SkipDescription = {
	logLines: string[];
	history: { title: string; items: HistoryItem[] };
};

function renderLabel(
	icon: string | undefined,
	label: string | undefined,
	fallback: string,
) {
	const trimmedLabel = label && label.trim().length > 0 ? label : fallback;
	if (icon && icon.trim().length > 0) {
		return `${icon} ${trimmedLabel}`;
	}
	return trimmedLabel;
}

function describeSources(skip: AdvanceSkip) {
	if (!skip.sources.length) {
		return { list: [] as string[], summary: 'Skipped' };
	}
	const list = skip.sources.map((source) => {
		const icon = source.meta?.source?.icon ?? '';
		const detail = source.detail;
		const labelToken = source.meta?.source?.labelToken;
		const id = source.meta?.source?.id ?? source.id;
		const label = detail ?? labelToken ?? id;
		if (icon) {
			return `${icon} ${label}`;
		}
		return label;
	});
	return { list, summary: `Skipped due to: ${list.join(', ')}` };
}

export function describeSkipEvent(
	skip: AdvanceSkip,
	phase: PhaseLike,
	step?: StepLike,
): SkipDescription {
	const phaseLabel = renderLabel(phase.icon, phase.label, phase.id);
	if (skip.type === 'phase') {
		const { list, summary } = describeSources(skip);
		const header = `⏭️ ${phaseLabel} Phase skipped`;
		const logLines = list.length
			? [header, ...list.map((item) => `  • ${item}`)]
			: [header];
		const historyItems: HistoryItem[] = [{ text: summary, italic: true }];
		return {
			logLines,
			history: { title: `${phaseLabel} Phase`, items: historyItems },
		};
	}

	const stepLabel = renderLabel(step?.icon, step?.title, skip.stepId ?? '');
	const { list, summary } = describeSources(skip);
	const header = stepLabel ? `⏭️ ${stepLabel} skipped` : '⏭️ Step skipped';
	const logLines = list.length
		? [header, ...list.map((item) => `  • ${item}`)]
		: [header];
	const historyItems: HistoryItem[] = [{ text: summary, italic: true }];
	const title = step?.title ?? skip.stepId ?? 'Skipped Step';
	return { logLines, history: { title, items: historyItems } };
}
