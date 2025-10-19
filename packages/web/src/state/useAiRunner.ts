import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { ActionTrace } from '@kingdom-builder/protocol/actions';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { diffStepSnapshots, logContent, snapshotPlayer } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { TranslationDiffContext } from '../translation';
import { LOG_KEYWORDS } from '../translation/log/logMessages';
import {
	appendSubActionChanges,
	ensureTimelineLines,
	filterActionDiffChanges,
	presentResolutionOrLog,
} from './useActionPerformer.helpers';
import {
	buildActionLogTimeline,
	buildDevelopActionLogTimeline,
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import { getSessionSnapshot } from './sessionStateStore';
import { enqueueSessionTask, hasAiController, runAiTurn } from './sessionAi';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import type { Action } from './actionTypes';

type ActionPlayer = Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;

interface AiActionLogEntry {
	actionId: string;
	playerId: string;
	traces?: ActionTrace[];
}

interface UseAiRunnerOptions {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	mountedRef: MutableRefObject<boolean>;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
	resourceKeys: SessionResourceKey[];
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addLog: (entry: string | string[], player?: ActionPlayer) => void;
	onFatalSessionError?: (error: unknown) => void;
}

interface ActionSummary {
	action: ReturnType<typeof buildResolutionActionMeta>;
	logLines: string[];
	summaries: string[];
	player: ActionPlayer;
	timeline: ReturnType<typeof buildActionLogTimeline>;
}

function buildActionSummary(
	logEntry: AiActionLogEntry,
	translationContext: TranslationContext,
	diffContext: TranslationDiffContext,
	snapshotBefore: SessionSnapshot,
	snapshotAfter: SessionSnapshot,
	registries: UseAiRunnerOptions['registries'],
	resourceKeys: SessionResourceKey[],
): ActionSummary | null {
	const playerAfter = snapshotAfter.game.players.find(
		(player) => player.id === logEntry.playerId,
	);
	if (!playerAfter) {
		return null;
	}
	const playerBefore = snapshotBefore.game.players.find(
		(player) => player.id === logEntry.playerId,
	);
	if (!playerBefore) {
		return null;
	}
	const stepDef = translationContext.actions.get(logEntry.actionId);
	const registryAction = registries.actions.get(logEntry.actionId);
	if (!stepDef || !registryAction) {
		return null;
	}
	const action: Action = {
		id: registryAction.id,
		name: registryAction.name,
		...(registryAction.system !== undefined
			? { system: registryAction.system }
			: {}),
	};
	const rawMessages = logContent(
		'action',
		logEntry.actionId,
		translationContext,
	);
	const messages = ensureTimelineLines(rawMessages);
	const subLines = appendSubActionChanges({
		traces: logEntry.traces ?? [],
		context: translationContext,
		diffContext,
		resourceKeys,
		messages,
	});
	const before = snapshotPlayer(playerBefore);
	const after = snapshotPlayer(playerAfter);
	const resolvedStep = resolveActionEffects(stepDef);
	const diffLines = diffStepSnapshots(
		before,
		after,
		resolvedStep,
		diffContext,
		resourceKeys,
	);
	const filtered = filterActionDiffChanges({
		changes: diffLines,
		messages,
		subLines,
	});
	const useDevelopFormatter = filtered.some((line) =>
		line.startsWith(LOG_KEYWORDS.developed),
	);
	const buildTimeline = useDevelopFormatter
		? buildDevelopActionLogTimeline
		: buildActionLogTimeline;
	const formatLines = useDevelopFormatter
		? formatDevelopActionLogLines
		: formatActionLogLines;
	const timeline = buildTimeline(messages, filtered);
	const logLines = formatLines(messages, filtered);
	const headline = messages[0]?.text;
	const actionMeta = buildResolutionActionMeta(action, stepDef, headline);
	const playerIdentity: ActionPlayer = {
		id: playerAfter.id,
		name: playerAfter.name,
	};
	return {
		action: actionMeta,
		logLines,
		summaries: filtered,
		player: playerIdentity,
		timeline,
	};
}

export function useAiRunner({
	sessionId,
	sessionSnapshot,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	registries,
	resourceKeys,
	showResolution,
	addLog,
	onFatalSessionError,
}: UseAiRunnerOptions) {
	const runningRef = useRef(false);

	const runAiSequence = useCallback(async () => {
		if (runningRef.current) {
			return;
		}
		runningRef.current = true;
		let fatalError: unknown = null;
		const forwardFatalError = (error: unknown) => {
			if (fatalError !== null) {
				return;
			}
			fatalError = error;
			if (isFatalSessionError(error)) {
				return;
			}
			if (onFatalSessionError) {
				markFatalSessionError(error);
				onFatalSessionError(error);
			}
		};
		try {
			while (mountedRef.current) {
				const beforeSnapshot = getSessionSnapshot(sessionId);
				if (beforeSnapshot.game.conclusion) {
					break;
				}
				const phaseDefinition =
					beforeSnapshot.phases[beforeSnapshot.game.phaseIndex];
				if (!phaseDefinition?.action) {
					break;
				}
				const activeId = beforeSnapshot.game.activePlayerId;
				if (!hasAiController(sessionId, activeId)) {
					break;
				}
				try {
					await runAiTurn(sessionId, activeId);
				} catch (error) {
					forwardFatalError(error);
					break;
				}
				if (fatalError !== null || !mountedRef.current) {
					return;
				}
				const afterSnapshot = getSessionSnapshot(sessionId);
				syncPhaseState(afterSnapshot);
				if (afterSnapshot.game.conclusion) {
					break;
				}
				const { translationContext, diffContext } =
					createSessionTranslationContext({
						snapshot: afterSnapshot,
						ruleSnapshot: afterSnapshot.rules,
						passiveRecords: afterSnapshot.passiveRecords,
						registries,
					});
				const logEntry =
					translationContext.pullEffectLog<AiActionLogEntry>('ai:action');
				if (!logEntry) {
					break;
				}
				const summary = buildActionSummary(
					logEntry,
					translationContext,
					diffContext,
					beforeSnapshot,
					afterSnapshot,
					registries,
					resourceKeys,
				);
				if (!summary) {
					const fallback = `AI played ${logEntry.actionId}`;
					addLog(fallback);
					continue;
				}
				try {
					await presentResolutionOrLog({
						action: summary.action,
						logLines: summary.logLines,
						summaries: summary.summaries,
						player: summary.player,
						showResolution,
						addLog,
						timeline: summary.timeline,
					});
				} catch (error) {
					forwardFatalError(error);
					return;
				}
				if (fatalError !== null || !mountedRef.current) {
					return;
				}
			}
		} finally {
			runningRef.current = false;
		}
		if (fatalError !== null) {
			return;
		}
		void enqueueSessionTask(sessionId, async () => {
			if (fatalError !== null) {
				return;
			}
			try {
				syncPhaseState(getSessionSnapshot(sessionId), {
					isAdvancing: true,
					canEndTurn: false,
				});
				await runUntilActionPhaseCore();
			} catch (error) {
				forwardFatalError(error);
			}
		});
	}, [
		addLog,
		registries,
		resourceKeys,
		runUntilActionPhaseCore,
		sessionId,
		showResolution,
		syncPhaseState,
		mountedRef,
		onFatalSessionError,
	]);

	useEffect(() => {
		const phaseDefinition =
			sessionSnapshot.phases[sessionSnapshot.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		if (sessionSnapshot.game.conclusion) {
			return;
		}
		const activeId = sessionSnapshot.game.activePlayerId;
		if (!hasAiController(sessionId, activeId)) {
			return;
		}
		void runAiSequence();
	}, [
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.phaseIndex,
		sessionSnapshot.game.conclusion,
		sessionSnapshot.phases,
		runAiSequence,
	]);
}
