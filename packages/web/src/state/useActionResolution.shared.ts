import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';

interface ResolutionActionMeta {
	id: string;
	name: string;
	icon?: string;
}

interface ResolutionSourceBase {
	kind: 'action' | 'phase';
	label: string;
	icon?: string;
}

interface ResolutionActionSource extends ResolutionSourceBase {
	kind: 'action';
	id: string;
	name: string;
}

interface ResolutionPhaseSource extends ResolutionSourceBase {
	kind: 'phase';
	id?: string;
	name?: string;
}

type ResolutionSourceDetail = ResolutionActionSource | ResolutionPhaseSource;

type ResolutionSource = 'action' | 'phase' | ResolutionSourceDetail;

interface ShowResolutionOptions {
	lines: string | string[];
	player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	action?: ResolutionActionMeta;
	summaries?: string[];
	source?: ResolutionSource;
	actorLabel?: string;
	requireAcknowledgement?: boolean;
	timeline?: ActionLogLineDescriptor[];
}

interface ActionResolution {
	lines: string[];
	visibleLines: string[];
	timeline: ActionLogLineDescriptor[];
	visibleTimeline: ActionLogLineDescriptor[];
	isComplete: boolean;
	player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	action?: ResolutionActionMeta;
	summaries: string[];
	source: ResolutionSource;
	actorLabel?: string;
	requireAcknowledgement: boolean;
}

const RESOLUTION_INDENT_PATTERNS: RegExp[] = [
	/^(?: {3})/u,
	/^(?:[ \t]*[•▪‣◦●]\s+)/u,
	/^(?:[ \t]*[↳➜➤➣]\s+)/u,
];

function deriveTimelineDescriptor(line: string): ActionLogLineDescriptor {
	let remaining = line;
	let depth = 0;
	let matched = true;

	while (matched) {
		matched = false;
		for (const pattern of RESOLUTION_INDENT_PATTERNS) {
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
	return {
		text,
		depth,
		kind: depth === 0 ? 'headline' : 'effect',
	};
}

function deriveTimelineFromLines(lines: readonly string[]) {
	return lines.map((line) => deriveTimelineDescriptor(line));
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

export {
	deriveTimelineFromLines,
	isPhaseSourceDetail,
	resolveActorLabel,
	shouldAppendPhaseResolution,
};
export type {
	ActionResolution,
	ResolutionActionMeta,
	ResolutionSource,
	ShowResolutionOptions,
};
