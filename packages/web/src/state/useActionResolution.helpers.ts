import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import type {
	ActionResolution,
	ResolutionActionMeta,
	ResolutionSource,
} from './useActionResolution.types';

const INDENT_PATTERNS = [
	/^(?: {3})/,
	/^(?:[ \t]*[•▪‣◦●]\s+)/u,
	/^(?:[ \t]*[↳➜➤➣]\s+)/u,
];

function deriveTimelineDescriptors(
	lines: readonly string[],
): ActionLogLineDescriptor[] {
	const descriptors: ActionLogLineDescriptor[] = [];
	for (const [index, line] of lines.entries()) {
		let remaining = line;
		let depth = 0;
		let matched = true;
		while (matched) {
			matched = false;
			for (const pattern of INDENT_PATTERNS) {
				const match = remaining.match(pattern);
				if (match && match[0].length > 0) {
					remaining = remaining.slice(match[0].length);
					depth += 1;
					matched = true;
					break;
				}
			}
		}
		const text = remaining.trimStart();
		const kind = index === 0 && depth === 0 ? 'headline' : 'effect';
		descriptors.push({ text, depth, kind });
	}
	return descriptors;
}

function resolveActorLabel(
	label: string | undefined,
	source: ResolutionSource,
	action: ResolutionActionMeta | undefined,
): string | undefined {
	const trimmed = label?.trim();
	if (trimmed) {
		return trimmed;
	}
	if (typeof source === 'string') {
		if (source === 'action') {
			return action?.name?.trim() || undefined;
		}
		return undefined;
	}
	if (source.kind === 'action') {
		return source.name?.trim() || action?.name?.trim() || undefined;
	}
	return undefined;
}

const isPhaseSourceDetail = (
	source: ResolutionSource,
): source is Extract<ResolutionSource, { kind: 'phase' }> =>
	typeof source !== 'string' && source.kind === 'phase';

const resolvePhaseIdentity = (
	source: Extract<ResolutionSource, { kind: 'phase' }>,
) => source.id?.trim() || source.label?.trim() || null;

function shouldAppendPhaseResolution(
	existing: ActionResolution | null,
	nextSource: ResolutionSource,
	requireAcknowledgement: boolean,
) {
	if (
		!existing ||
		existing.requireAcknowledgement ||
		requireAcknowledgement ||
		!isPhaseSourceDetail(existing.source) ||
		!isPhaseSourceDetail(nextSource)
	) {
		return false;
	}
	const existingIdentity = resolvePhaseIdentity(existing.source);
	const nextIdentity = resolvePhaseIdentity(nextSource);
	return Boolean(
		existingIdentity && nextIdentity && existingIdentity === nextIdentity,
	);
}

function resolveTimelineEntries(
	entries: readonly string[],
	timeline: ActionLogLineDescriptor[] | undefined,
): ActionLogLineDescriptor[] {
	const sanitized = Array.isArray(timeline)
		? timeline.filter((entry): entry is ActionLogLineDescriptor =>
				Boolean(entry?.text?.trim()),
			)
		: null;
	if (sanitized && sanitized.length === entries.length) {
		return sanitized;
	}
	return deriveTimelineDescriptors(entries);
}

function resolveVisibleTimelineEntries(
	visibleTimeline: ActionLogLineDescriptor[] | undefined,
): ActionLogLineDescriptor[] {
	return Array.isArray(visibleTimeline)
		? visibleTimeline.filter((entry): entry is ActionLogLineDescriptor =>
				Boolean(entry?.text?.trim()),
			)
		: [];
}

export {
	isPhaseSourceDetail,
	resolveActorLabel,
	resolveTimelineEntries,
	resolveVisibleTimelineEntries,
	shouldAppendPhaseResolution,
};
