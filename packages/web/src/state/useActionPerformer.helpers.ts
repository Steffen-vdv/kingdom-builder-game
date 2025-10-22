import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	buildActionLogTimeline,
	formatActionLogLines,
} from './actionLogFormat';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import type { Action } from './actionTypes';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';
import { createResolutionLogSnapshot } from './actionResolutionLog';
import type { PhaseProgressState } from './usePhaseProgress';
export {
	ensureTimelineLines,
	appendSubActionChanges,
	buildActionCostLines,
	filterActionDiffChanges,
	buildActionResolution,
} from './buildActionResolution';
export type {
	BuildActionResolutionOptions,
	BuildActionResolutionResult,
} from './buildActionResolution';
import type { SessionResourceKey } from './sessionTypes';

interface HandleMissingActionDefinitionOptions {
	action: Action;
	player: Pick<SessionPlayerStateSnapshot, 'id' | 'name' | 'resources'>;
	snapshot: SessionSnapshot;
	actionCostResource: SessionResourceKey;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addResolutionLog: (resolution: ActionResolution) => void;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	refresh: () => void;
	mountedRef: { current: boolean };
	endTurn: () => Promise<void>;
}

export async function handleMissingActionDefinition({
	action,
	player,
	snapshot,
	actionCostResource,
	showResolution,
	addResolutionLog,
	syncPhaseState,
	refresh,
	mountedRef,
	endTurn,
}: HandleMissingActionDefinitionOptions) {
	console.warn(
		`Missing action definition for ${action.id}; using fallback resolution logs.`,
	);
	const fallbackHeadline = `Played ${action.name}`;
	const fallbackChange =
		'No detailed log available because the action definition was missing.';
	const fallbackMessages: ActionLogLineDescriptor[] = [
		{
			text: fallbackHeadline,
			depth: 0,
			kind: 'headline',
		},
	];
	const fallbackChanges = [{ summary: fallbackChange }];
	const timeline = buildActionLogTimeline(fallbackMessages, fallbackChanges);
	const logLines = formatActionLogLines(fallbackMessages, fallbackChanges);
	const actionMeta = buildResolutionActionMeta(
		action,
		undefined,
		fallbackHeadline,
		undefined,
	);
	const resolutionSource = {
		kind: 'action' as const,
		label: 'Action',
		id: actionMeta.id,
		name: actionMeta.name,
		icon: actionMeta.icon ?? '',
	} satisfies ShowResolutionOptions['source'];
	const resolutionPlayer = {
		id: player.id,
		name: player.name,
	} satisfies ShowResolutionOptions['player'];
	const resolutionSnapshot = createResolutionLogSnapshot({
		lines: logLines,
		timeline,
		summaries: [],
		source: resolutionSource,
		action: actionMeta,
		player: resolutionPlayer,
		actorLabel: 'Played by',
	});
	syncPhaseState(snapshot);
	refresh();
	try {
		await showResolution({
			action: actionMeta,
			lines: logLines,
			player: resolutionPlayer,
			summaries: [],
			source: resolutionSource,
			actorLabel: 'Played by',
			timeline,
		});
	} catch (error) {
		void error;
	}
	addResolutionLog(resolutionSnapshot);
	if (!mountedRef.current) {
		return;
	}
	if (snapshot.game.conclusion) {
		return;
	}
	if (
		snapshot.game.devMode &&
		(player.resources[actionCostResource] ?? 0) <= 0
	) {
		await endTurn();
	}
}

interface PresentResolutionOptions {
	action: ReturnType<typeof buildResolutionActionMeta>;
	logLines: string[];
	summaries: string[];
	player: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addResolutionLog: (resolution: ActionResolution) => void;
	timeline: ActionLogLineDescriptor[];
}

export async function presentResolutionOrLog({
	action,
	logLines,
	summaries,
	player,
	showResolution,
	addResolutionLog,
	timeline,
}: PresentResolutionOptions) {
	const source = {
		kind: 'action' as const,
		label: 'Action',
		id: action.id,
		name: action.name,
		icon: action.icon ?? '',
	} satisfies ShowResolutionOptions['source'];
	const playerIdentity = {
		id: player.id,
		name: player.name,
	} satisfies ShowResolutionOptions['player'];
	try {
		await showResolution({
			action,
			lines: logLines,
			player: playerIdentity,
			summaries,
			source,
			actorLabel: 'Played by',
			timeline,
		});
	} catch (error) {
		void error;
		const snapshot = createResolutionLogSnapshot({
			lines: logLines,
			timeline,
			summaries,
			source,
			action,
			player: playerIdentity,
			actorLabel: 'Played by',
		});
		addResolutionLog(snapshot);
	}
}
