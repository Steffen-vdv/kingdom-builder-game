import type { ResolutionSource } from '../state/useActionResolution';

interface ResolutionLabels {
	readonly title: string;
	readonly player: string;
}

const SOURCE_LABELS: Record<'action' | 'phase', ResolutionLabels> = {
	action: {
		title: 'Action',
		player: 'Played by',
	},
	phase: {
		title: 'Phase',
		player: 'Phase owner',
	},
};

const LEADING_EMOJI_PATTERN =
	/^(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/u;

function extractLeadingIcon(value: string | undefined) {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trimStart();
	if (!trimmed) {
		return undefined;
	}
	const match = trimmed.match(LEADING_EMOJI_PATTERN);
	if (!match) {
		return undefined;
	}
	const icon = match[0]?.trim();
	return icon && /\p{Extended_Pictographic}/u.test(icon) ? icon : undefined;
}

function isSourceDetail(
	source: ResolutionSource | undefined,
): source is Exclude<ResolutionSource, 'action' | 'phase'> {
	return typeof source === 'object' && source !== null && 'kind' in source;
}

function resolveSourceLabels(source: ResolutionSource | undefined) {
	if (!source) {
		return SOURCE_LABELS.action;
	}
	if (typeof source === 'string') {
		return SOURCE_LABELS[source] ?? SOURCE_LABELS.action;
	}
	const fallback = SOURCE_LABELS[source.kind] ?? SOURCE_LABELS.action;
	const title = source.label?.trim() || fallback.title;
	return {
		title,
		player: fallback.player,
	};
}

export {
	LEADING_EMOJI_PATTERN,
	SOURCE_LABELS,
	extractLeadingIcon,
	isSourceDetail,
	resolveSourceLabels,
};
export type { ResolutionLabels };
