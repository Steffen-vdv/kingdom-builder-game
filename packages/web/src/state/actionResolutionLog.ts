import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol/session';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import type { TranslationContext } from '../translation/context';
import type { ActionTitleDefinition } from '../translation/formatActionTitle';
import type { Action } from './actionTypes';
import {
	buildActionLogTimeline,
	formatActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import type {
	ActionResolution,
	ResolutionActionMeta,
	ResolutionSource,
} from './useActionResolution';

interface CreateResolutionLogSnapshotOptions {
	lines: readonly string[];
	timeline: readonly ActionLogLineDescriptor[];
	summaries: readonly string[];
	source: ResolutionSource;
	action?: ResolutionActionMeta;
	player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	actorLabel?: string;
	requireAcknowledgement?: boolean;
}

function cloneSource(source: ResolutionSource): ResolutionSource {
	if (typeof source === 'string') {
		return source;
	}
	return { ...source };
}

function createResolutionLogSnapshot({
	lines,
	timeline,
	summaries,
	source,
	action,
	player,
	actorLabel,
	requireAcknowledgement = false,
}: CreateResolutionLogSnapshotOptions): ActionResolution {
	return {
		lines: [...lines],
		visibleLines: [...lines],
		timeline: timeline.map((descriptor) => ({ ...descriptor })),
		visibleTimeline: timeline.map((descriptor) => ({ ...descriptor })),
		isComplete: true,
		summaries: [...summaries],
		source: cloneSource(source),
		requireAcknowledgement,
		...(action ? { action: { ...action } } : {}),
		...(player ? { player: { ...player } } : {}),
		...(actorLabel ? { actorLabel } : {}),
	};
}

interface CreateFailureResolutionOptions {
	action: Action;
	stepDefinition?: ActionTitleDefinition;
	player: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	detail: string;
	headline?: string;
	context?: TranslationContext;
}

function resolveActionSource(
	actionMeta: ResolutionActionMeta,
): ResolutionSource {
	if (actionMeta.icon) {
		return {
			kind: 'action',
			label: 'Action',
			id: actionMeta.id,
			name: actionMeta.name,
			icon: actionMeta.icon,
		};
	}
	return {
		kind: 'action',
		label: 'Action',
		id: actionMeta.id,
		name: actionMeta.name,
	};
}

function createFailureResolutionSnapshot({
	action,
	stepDefinition,
	player,
	detail,
	headline = 'Action failed',
	context,
}: CreateFailureResolutionOptions): ActionResolution {
	const descriptors: ActionLogLineDescriptor[] = [
		{ text: headline, depth: 0, kind: 'headline' },
		{ text: detail, depth: 1, kind: 'effect' },
	];
	const timeline = buildActionLogTimeline(descriptors, []);
	const lines = formatActionLogLines(descriptors, []);
	const actionMeta = buildResolutionActionMeta(
		action,
		stepDefinition,
		headline,
		context,
	);
	const source = resolveActionSource(actionMeta);
	return createResolutionLogSnapshot({
		lines,
		timeline,
		summaries: [detail],
		source,
		action: actionMeta,
		player,
		actorLabel: 'Played by',
	});
}

export {
	createFailureResolutionSnapshot,
	createResolutionLogSnapshot,
	cloneSource,
};
export type { CreateResolutionLogSnapshotOptions };
