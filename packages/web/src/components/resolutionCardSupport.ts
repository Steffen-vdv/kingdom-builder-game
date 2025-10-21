import { normalizeModifierDescription } from './ResolutionTimeline';
import type { ResolutionSource } from '../state/useActionResolution';

interface ResolutionLabels {
	title: string;
	player: string;
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

const TRAILING_PHASE_PATTERN = /\bPhase\b$/iu;

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

function isResolutionSourceDetail(
	source: ResolutionSource | undefined,
): source is Exclude<ResolutionSource, 'action' | 'phase'> {
	return typeof source === 'object' && source !== null && 'kind' in source;
}

function resolveResolutionSourceLabels(source: ResolutionSource | undefined) {
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
	} satisfies ResolutionLabels;
}

function parseResolutionLine(line: string) {
	const patterns = [
		/^(?: {3})/,
		/^(?:[ \t]*[•▪‣◦●]\s+)/u,
		/^(?:[ \t]*[↳➜➤➣]\s+)/u,
	];

	let remaining = line;
	let depth = 0;
	let matched = true;

	while (matched) {
		matched = false;
		for (const pattern of patterns) {
			const match = remaining.match(pattern);
			if (match && match[0].length > 0) {
				remaining = remaining.slice(match[0].length);
				depth += 1;
				matched = true;
				break;
			}
		}
	}

	const text = normalizeModifierDescription(remaining.trimStart());
	return { depth, text };
}

function buildFallbackResolutionLines(lines: string[]) {
	return lines.map((line) => parseResolutionLine(line));
}

export type { ResolutionLabels };
export {
	buildFallbackResolutionLines,
	extractLeadingIcon,
	isResolutionSourceDetail,
	LEADING_EMOJI_PATTERN,
	resolveResolutionSourceLabels,
	SOURCE_LABELS,
	TRAILING_PHASE_PATTERN,
};
