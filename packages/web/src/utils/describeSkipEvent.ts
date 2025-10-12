import type { SessionAdvanceSkipSnapshot } from '@kingdom-builder/protocol/session';
import {
	hasTierSummaryTranslation,
	translateTierSummary,
} from '../translation/content';
import type { TranslationAssets } from '../translation/context';

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

type DescriptorContext = {
	skip: SessionAdvanceSkipSnapshot;
	phase: PhaseLike;
	phaseLabel: string;
	step?: StepLike;
	stepLabel?: string;
	sources: ReturnType<typeof describeSources>;
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

function resolveSourceLabel(
	detail: string | undefined,
	labelToken: string | undefined,
	fallback: string,
	assets?: TranslationAssets,
) {
	const normalize = (value: string | undefined) => {
		if (!value) {
			return undefined;
		}
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	};
	const translateToken = (value: string | undefined) => {
		const token = normalize(value);
		if (!token) {
			return undefined;
		}
		if (!hasTierSummaryTranslation(token, assets)) {
			return undefined;
		}
		return translateTierSummary(token, assets) ?? token;
	};
	return (
		translateToken(detail) ||
		translateToken(labelToken) ||
		normalize(detail) ||
		normalize(labelToken) ||
		fallback
	);
}

function describeSources(
	skip: SessionAdvanceSkipSnapshot,
	assets?: TranslationAssets,
) {
	if (!skip.sources.length) {
		return { list: [] as string[], summary: 'Skipped' };
	}
	const list = skip.sources.map((source) => {
		const icon = source.meta?.source?.icon ?? '';
		const detail = source.detail;
		const labelToken = source.meta?.source?.labelToken;
		const id = source.meta?.source?.id ?? source.id;
		const label = resolveSourceLabel(detail, labelToken, id, assets);
		if (icon) {
			return `${icon} ${label}`;
		}
		return label;
	});
	return { list, summary: `Skipped due to: ${list.join(', ')}` };
}

function createHistoryItems(summary: string): HistoryItem[] {
	return [
		{
			text: summary,
			italic: true,
		},
	];
}

export function describeSkipEvent(
	skip: SessionAdvanceSkipSnapshot,
	phase: PhaseLike,
	step?: StepLike,
	assets?: TranslationAssets,
): SkipDescription {
	const phaseLabel = renderLabel(phase.icon, phase.label, phase.id);
	const renderedStepLabel = renderLabel(
		step?.icon,
		step?.title,
		skip.stepId ?? '',
	);
	const stepLabel =
		renderedStepLabel.trim().length > 0 ? renderedStepLabel : undefined;
	const sources = describeSources(skip, assets);

	const descriptorContext: DescriptorContext = {
		skip,
		phase,
		phaseLabel,
		sources,
		...(step ? { step } : {}),
		...(stepLabel ? { stepLabel } : {}),
	};

	const descriptorMap: Record<
		SessionAdvanceSkipSnapshot['type'],
		(context: DescriptorContext) => SkipDescription
	> = {
		phase: ({ phaseLabel: label, sources: { list, summary } }) => {
			const header = `⏭️ ${label} Phase skipped`;
			const logLines = list.length
				? [header, ...list.map((item) => `  • ${item}`)]
				: [header];
			const historyItems = createHistoryItems(summary);
			return {
				logLines,
				history: {
					title: `${label} Phase`,
					items: historyItems,
				},
			};
		},
		step: ({
			step,
			stepLabel: label,
			skip: { stepId },
			sources: { list, summary },
		}) => {
			const header = label ? `⏭️ ${label} skipped` : '⏭️ Step skipped';
			const logLines = list.length
				? [header, ...list.map((item) => `  • ${item}`)]
				: [header];
			const historyItems = createHistoryItems(summary);
			const title = step?.title ?? stepId ?? 'Skipped Step';
			return {
				logLines,
				history: {
					title,
					items: historyItems,
				},
			};
		},
	};

	const defaultDescriptor = ({
		phaseLabel: label,
		stepLabel: labelOverride,
		skip: { stepId },
		phase: phaseContext,
		sources: { list, summary },
	}: DescriptorContext) => {
		const headerLabel = labelOverride ?? label;
		const header = headerLabel
			? `⏭️ ${headerLabel} skipped`
			: '⏭️ Step skipped';
		const logLines = list.length
			? [header, ...list.map((item) => `  • ${item}`)]
			: [header];
		const historyItems = createHistoryItems(summary);
		const historyTitle =
			labelOverride ??
			stepId ??
			(phaseContext.label ? `${phaseContext.label} Phase` : phaseContext.id);
		return {
			logLines,
			history: { title: historyTitle, items: historyItems },
		};
	};

	const descriptor =
		(
			descriptorMap as Record<
				string,
				(context: DescriptorContext) => SkipDescription
			>
		)[skip.type] ?? defaultDescriptor;

	return descriptor(descriptorContext);
}
