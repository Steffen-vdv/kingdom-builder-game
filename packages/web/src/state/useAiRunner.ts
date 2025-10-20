import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { getSessionSnapshot } from './sessionStateStore';
import { enqueueSessionTask, hasAiController, runAiTurn } from './sessionAi';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import { snapshotPlayer } from '../translation';
import { buildActionResolution } from './buildActionResolution';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import type { ShowResolutionOptions } from './useActionResolution';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import { createResolutionLogSnapshot } from './actionResolutionLog';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import type { Action } from './actionTypes';

interface UseAiRunnerOptions {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	mountedRef: MutableRefObject<boolean>;
	onFatalSessionError?: (error: unknown) => void;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	registries: SessionRegistries;
	resourceKeys: readonly SessionResourceKey[];
	actionCostResource: SessionResourceKey;
	addResolutionLog: (
		resolution: ReturnType<typeof createResolutionLogSnapshot>,
	) => void;
}

export function useAiRunner({
	sessionId,
	sessionSnapshot,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	onFatalSessionError,
	showResolution,
	registries,
	resourceKeys,
	actionCostResource,
	addResolutionLog,
}: UseAiRunnerOptions) {
	const runningRef = useRef(false);
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
		if (runningRef.current) {
			return;
		}
		void (async () => {
			runningRef.current = true;
			const resetRunning = () => {
				runningRef.current = false;
			};
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
				const result = await runAiTurn(sessionId, activeId);
				if (fatalError !== null) {
					resetRunning();
					return;
				}
				syncPhaseState(result.snapshot);
				if (!result.ranTurn) {
					resetRunning();
					return;
				}
				if (!mountedRef.current) {
					resetRunning();
					return;
				}
				if (fatalError !== null) {
					resetRunning();
					return;
				}
				const { translationContext, diffContext } =
					createSessionTranslationContext({
						snapshot: result.snapshot,
						ruleSnapshot: result.snapshot.rules,
						passiveRecords: result.snapshot.passiveRecords,
						registries: result.registries,
					});
				const activePlayer =
					result.snapshot.game.players.find(
						(player) => player.id === activeId,
					) ??
					sessionSnapshot.game.players.find((player) => player.id === activeId);
				const playerIdentity = activePlayer
					? {
							id: activePlayer.id,
							name: activePlayer.name,
						}
					: undefined;
				const resourceKeySet = new Set(resourceKeys);
				resourceKeySet.add(actionCostResource);
				for (const action of result.actions) {
					if (!mountedRef.current) {
						break;
					}
					const primaryTrace = action.traces[0];
					const finalTrace =
						action.traces[action.traces.length - 1] ?? primaryTrace;
					if (
						!primaryTrace ||
						!primaryTrace.before ||
						!finalTrace ||
						!finalTrace.after
					) {
						continue;
					}
					const before = snapshotPlayer(primaryTrace.before);
					const after = snapshotPlayer(finalTrace.after);
					const actionDefinition =
						translationContext.actions.get(action.actionId) ??
						registries.actions.get(action.actionId);
					if (!actionDefinition) {
						continue;
					}
					const resolution = buildActionResolution({
						actionId: action.actionId,
						actionDefinition,
						...(action.params ? { params: action.params } : {}),
						traces: action.traces,
						costs: action.costs,
						before,
						after,
						translationContext,
						diffContext,
						resourceKeys: Array.from(resourceKeySet),
						resources: result.registries.resources,
					});
					const actionMeta = buildResolutionActionMeta(
						{
							id: action.actionId,
							name:
								typeof actionDefinition.name === 'string'
									? actionDefinition.name
									: action.actionId,
							...(typeof actionDefinition.system === 'boolean'
								? {
										system: actionDefinition.system,
									}
								: {}),
						} satisfies Action,
						actionDefinition,
						resolution.headline,
					);
					const source = {
						kind: 'action' as const,
						label: 'Action',
						id: actionMeta.id,
						name: actionMeta.name,
						...(actionMeta.icon ? { icon: actionMeta.icon } : {}),
					} satisfies ShowResolutionOptions['source'];
					const options: ShowResolutionOptions = {
						action: actionMeta,
						lines: resolution.logLines,
						summaries: resolution.summaries,
						source,
						actorLabel: 'Played by',
						timeline: resolution.timeline,
						...(playerIdentity ? { player: playerIdentity } : {}),
					};
					try {
						await showResolution(options);
					} catch (error) {
						const snapshot = createResolutionLogSnapshot({
							lines: resolution.logLines,
							timeline: resolution.timeline,
							summaries: resolution.summaries,
							source,
							action: actionMeta,
							...(playerIdentity
								? {
										player: playerIdentity,
									}
								: {}),
							actorLabel: 'Played by',
						});
						addResolutionLog(snapshot);
						void error;
					}
				}
				if (!mountedRef.current) {
					resetRunning();
					return;
				}
				if (!result.phaseComplete) {
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
			} catch (error) {
				forwardFatalError(error);
			} finally {
				resetRunning();
			}
		})();
	}, [
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.phaseIndex,
		sessionSnapshot.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		onFatalSessionError,
		showResolution,
		registries,
		resourceKeys,
		actionCostResource,
		addResolutionLog,
	]);
}
