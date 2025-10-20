import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { getSessionSnapshot } from './sessionStateStore';
import { enqueueSessionTask, hasAiController, runAiTurn } from './sessionAi';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import { snapshotPlayer } from '../translation';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import { buildActionResolution } from './buildActionResolution';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { createResolutionLogSnapshot } from './actionResolutionLog';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type {
	ShowResolutionOptions,
	ActionResolution,
} from './useActionResolution';
import {
	buildActionLogTimeline,
	formatActionLogLines,
} from './actionLogFormat';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';

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
	addResolutionLog: (resolution: ActionResolution) => void;
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
	const isRunningRef = useRef(false);
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
		if (isRunningRef.current) {
			return;
		}
		isRunningRef.current = true;
		const trackedResourceKeys = resourceKeys.includes(actionCostResource)
			? [...resourceKeys]
			: [...resourceKeys, actionCostResource];
		let disposed = false;
		void (async () => {
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

			const presentFallbackResolution = async (
				actionId: string,
				actionName: string,
				playerIdentity: ShowResolutionOptions['player'],
			) => {
				const fallbackHeadline = `Played ${actionName}`;
				const detail =
					'No detailed log available because the action definition was missing.';
				const descriptors: ActionLogLineDescriptor[] = [
					{ text: fallbackHeadline, depth: 0, kind: 'headline' },
					{ text: detail, depth: 1, kind: 'effect' },
				];
				const timeline = buildActionLogTimeline(descriptors, []);
				const logLines = formatActionLogLines(descriptors, []);
				const actionMeta = { id: actionId, name: actionName };
				const source: ShowResolutionOptions['source'] = {
					kind: 'action',
					label: 'Action',
					id: actionMeta.id,
					name: actionMeta.name,
				};
				try {
					await showResolution({
						action: actionMeta,
						lines: logLines,
						summaries: [detail],
						source,
						actorLabel: 'Played by',
						...(playerIdentity ? { player: playerIdentity } : {}),
						timeline,
					});
				} catch (error) {
					void error;
					const snapshot = createResolutionLogSnapshot({
						lines: logLines,
						timeline,
						summaries: [detail],
						source,
						action: actionMeta,
						...(playerIdentity ? { player: playerIdentity } : {}),
						actorLabel: 'Played by',
					});
					addResolutionLog(snapshot);
				}
			};

			const enqueueAdvance = async () => {
				if (fatalError !== null || disposed || !mountedRef.current) {
					return;
				}
				try {
					await enqueueSessionTask(sessionId, async () => {
						if (fatalError !== null || disposed) {
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
				}
			};

			try {
				while (true) {
					if (!mountedRef.current || disposed || fatalError !== null) {
						break;
					}
					let result;
					try {
						result = await runAiTurn(sessionId, activeId);
					} catch (error) {
						forwardFatalError(error);
						break;
					}
					if (fatalError !== null) {
						break;
					}
					syncPhaseState(result.snapshot);
					const playerSnapshot = result.snapshot.game.players.find(
						(entry) => entry.id === activeId,
					);
					const playerIdentity = playerSnapshot
						? { id: playerSnapshot.id, name: playerSnapshot.name }
						: undefined;
					if (!mountedRef.current || disposed || fatalError !== null) {
						break;
					}
					const combinedResources = {
						...registries.resources,
						...result.registries.resources,
					};
					if (result.actions.length > 0) {
						const { translationContext, diffContext } =
							createSessionTranslationContext({
								snapshot: result.snapshot,
								ruleSnapshot: result.snapshot.rules,
								passiveRecords: result.snapshot.passiveRecords,
								registries: result.registries,
							});
						for (const actionResult of result.actions) {
							if (!mountedRef.current || disposed || fatalError !== null) {
								break;
							}
							const primaryTrace = actionResult.traces[0];
							if (!primaryTrace) {
								continue;
							}
							const definition =
								result.registries.actions.get(actionResult.actionId) ??
								registries.actions.get(actionResult.actionId);
							const actionName =
								definition?.name?.trim() || actionResult.actionId;
							const before = snapshotPlayer(primaryTrace.before);
							const after = snapshotPlayer(primaryTrace.after);
							if (!definition) {
								await presentFallbackResolution(
									actionResult.actionId,
									actionName,
									playerIdentity,
								);
								continue;
							}
							const resolution = buildActionResolution({
								actionId: actionResult.actionId,
								actionDefinition: definition,
								...(actionResult.params ? { params: actionResult.params } : {}),
								traces: actionResult.traces,
								costs: actionResult.costs,
								before,
								after,
								translationContext,
								diffContext,
								resourceKeys: trackedResourceKeys,
								resources: combinedResources,
							});
							const actionMeta = buildResolutionActionMeta(
								{
									id: actionResult.actionId,
									name: actionName,
								},
								definition,
								resolution.headline,
							);
							const source: ShowResolutionOptions['source'] = {
								kind: 'action',
								label: 'Action',
								id: actionMeta.id,
								name: actionMeta.name,
								...(actionMeta.icon ? { icon: actionMeta.icon } : {}),
							};
							const options: ShowResolutionOptions = {
								action: actionMeta,
								lines: resolution.logLines,
								summaries: resolution.summaries,
								source,
								actorLabel: 'Played by',
								...(playerIdentity ? { player: playerIdentity } : {}),
								timeline: resolution.timeline,
							};
							try {
								await showResolution(options);
							} catch (error) {
								void error;
								const snapshot = createResolutionLogSnapshot({
									lines: resolution.logLines,
									timeline: resolution.timeline,
									summaries: resolution.summaries,
									source,
									action: actionMeta,
									...(playerIdentity ? { player: playerIdentity } : {}),
									actorLabel: 'Played by',
								});
								addResolutionLog(snapshot);
							}
						}
					}
					if (!mountedRef.current || disposed || fatalError !== null) {
						break;
					}
					if (!result.ranTurn) {
						if (result.phaseComplete) {
							await enqueueAdvance();
						}
						break;
					}
					if (result.phaseComplete) {
						await enqueueAdvance();
						break;
					}
				}
			} finally {
				isRunningRef.current = false;
			}
		})();
		return () => {
			disposed = true;
		};
	}, [
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.phaseIndex,
		sessionSnapshot.phases,
		sessionSnapshot.game.conclusion,
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
