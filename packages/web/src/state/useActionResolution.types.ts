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

export type {
	ActionResolution,
	ResolutionActionMeta,
	ResolutionSource,
	ShowResolutionOptions,
};
