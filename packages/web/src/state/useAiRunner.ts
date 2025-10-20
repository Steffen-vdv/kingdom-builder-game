import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { snapshotPlayer } from '../translation';
import { getSessionSnapshot } from './sessionStateStore';
import { enqueueSessionTask, hasAiController, runAiTurn } from './sessionAi';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import { buildActionResolution } from './buildActionResolution';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { createResolutionLogSnapshot } from './actionResolutionLog';
import type { Action } from './actionTypes';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';

interface UseAiRunnerOptions {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	mountedRef: MutableRefObject<boolean>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
	resourceKeys: SessionResourceKey[];
	actionCostResource: SessionResourceKey;
	addResolutionLog: (resolution: ActionResolution) => void;
	onFatalSessionError?: (error: unknown) => void;
}

export function useAiRunner({
	sessionId,
	sessionSnapshot,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	showResolution,
	registries,
	resourceKeys,
	actionCostResource,
	addResolutionLog,
	onFatalSessionError,
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
		runningRef.current = true;
		const runner = (async () => {
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
					return;
				}
				syncPhaseState(result.snapshot);
				const requestAdvance = () => {
					if (!result.phaseComplete) {
						return;
					}
					if (fatalError !== null) {
						return;
					}
					if (!mountedRef.current) {
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
				};
				if (!result.ranTurn) {
					requestAdvance();
					return;
				}
				if (!mountedRef.current) {
					return;
				}
				if (fatalError !== null) {
					return;
				}
				const resolutionResourceKeys = Array.from(
					new Set<SessionResourceKey>([...resourceKeys, actionCostResource]),
				);
				const translation = createSessionTranslationContext({
					snapshot: result.snapshot,
					ruleSnapshot: result.snapshot.rules,
					passiveRecords: result.snapshot.passiveRecords,
					registries,
				});
				const playerBefore = sessionSnapshot.game.players.find(
					(player) => player.id === activeId,
				);
				const playerAfter = result.snapshot.game.players.find(
					(player) => player.id === activeId,
				);
				const playerIdentity = playerAfter ?? playerBefore;
				const actions = Array.isArray(result.actions) ? result.actions : [];
				for (const action of actions) {
					if (!mountedRef.current) {
						return;
					}
					if (fatalError !== null) {
						return;
					}
					try {
						const firstTrace = action.traces[0];
						if (!firstTrace) {
							continue;
						}
						const lastTrace =
							action.traces[action.traces.length - 1] ?? firstTrace;
						const actionDefinition = registries.actions.get(action.actionId);
						if (!actionDefinition) {
							const message = [
								'Missing action definition while',
								'formatting AI resolution for action',
								`"${action.actionId}".`,
							].join(' ');
							throw new Error(message);
						}
						const actionDetails: Action = {
							id: action.actionId,
							name: actionDefinition.name ?? action.actionId,
						};
						if (actionDefinition.system !== undefined) {
							actionDetails.system = actionDefinition.system;
						}
						const before = snapshotPlayer(firstTrace.before);
						const after = snapshotPlayer(lastTrace.after);
						const resolution = buildActionResolution({
							actionId: action.actionId,
							actionDefinition,
							...(action.params ? { params: action.params } : {}),
							traces: action.traces,
							costs: action.costs ?? {},
							before,
							after,
							translationContext: translation.translationContext,
							diffContext: translation.diffContext,
							resourceKeys: resolutionResourceKeys,
							resources: registries.resources,
						});
						const actionMeta = buildResolutionActionMeta(
							actionDetails,
							actionDefinition,
							resolution.headline,
						);
						const source: ShowResolutionOptions['source'] = actionMeta.icon
							? {
									kind: 'action',
									label: 'Action',
									id: actionMeta.id,
									name: actionMeta.name,
									icon: actionMeta.icon,
								}
							: {
									kind: 'action',
									label: 'Action',
									id: actionMeta.id,
									name: actionMeta.name,
								};
						const player = playerIdentity
							? {
									id: playerIdentity.id,
									name: playerIdentity.name,
								}
							: undefined;
						try {
							await showResolution({
								action: actionMeta,
								lines: resolution.logLines,
								summaries: resolution.summaries,
								...(player ? { player } : {}),
								source,
								actorLabel: 'Played by',
								timeline: resolution.timeline,
							});
						} catch (error) {
							void error;
							const logSnapshot = createResolutionLogSnapshot({
								lines: resolution.logLines,
								timeline: resolution.timeline,
								summaries: resolution.summaries,
								source,
								action: actionMeta,
								...(player ? { player } : {}),
								actorLabel: 'Played by',
							});
							addResolutionLog(logSnapshot);
						}
					} catch (error) {
						forwardFatalError(error);
						return;
					}
				}
				if (fatalError !== null) {
					return;
				}
				requestAdvance();
			} catch (error) {
				forwardFatalError(error);
			}
		})();
		runner
			.catch(() => {})
			.finally(() => {
				runningRef.current = false;
			});
		void runner;
	}, [
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.phaseIndex,
		sessionSnapshot.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		showResolution,
		registries.actions,
		registries.buildings,
		registries.developments,
		registries.populations,
		registries.resources,
		resourceKeys,
		actionCostResource,
		addResolutionLog,
		onFatalSessionError,
	]);
}
