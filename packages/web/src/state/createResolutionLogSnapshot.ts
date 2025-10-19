import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import type {
	ActionResolution,
	ResolutionActionMeta,
	ShowResolutionOptions,
} from './useActionResolution';

interface CreateResolutionLogSnapshotOptions {
	lines: readonly string[];
	timeline: readonly ActionLogLineDescriptor[];
	summaries?: readonly string[];
	player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	action?: ResolutionActionMeta;
	source?: ShowResolutionOptions['source'];
	actorLabel?: string;
	requireAcknowledgement?: boolean;
}

function createResolutionLogSnapshot({
	lines,
	timeline,
	summaries = [],
	player,
	action,
	source,
	actorLabel,
	requireAcknowledgement = false,
}: CreateResolutionLogSnapshotOptions): ActionResolution {
	const sanitizedLines = lines.filter((line) => line.trim());
	const sanitizedTimeline = timeline.filter((entry) => entry?.text?.trim());
	const sanitizedSummaries = summaries
		.map((entry) => entry?.trim())
		.filter((entry): entry is string => Boolean(entry));
	const resolvedSource = source ?? 'action';
	const resolution: ActionResolution = {
		lines: [...sanitizedLines],
		visibleLines: [...sanitizedLines],
		timeline: [...sanitizedTimeline],
		visibleTimeline: [...sanitizedTimeline],
		isComplete: true,
		summaries: [...sanitizedSummaries],
		source: resolvedSource,
		requireAcknowledgement,
	};
	if (player) {
		resolution.player = { ...player };
	}
	if (action) {
		resolution.action = { ...action };
	}
	if (actorLabel?.trim()) {
		resolution.actorLabel = actorLabel.trim();
	}
	return resolution;
}

export type { CreateResolutionLogSnapshotOptions };
export { createResolutionLogSnapshot };
