import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type {
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { getSessionSnapshot } from './sessionStateStore';
import { enqueueSessionTask, hasAiController, runAiTurn } from './sessionAi';
import type { PhaseProgressState } from './usePhaseProgress';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import { snapshotPlayer, type PlayerSnapshot } from '../translation';
import { buildActionResolution } from './buildActionResolution';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import type { Action } from './actionTypes';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';
import { createResolutionLogSnapshot } from './actionResolutionLog';
import type {
	SessionRegistries,
	SessionResourceKey,
	SessionAiTurnResult,
} from './sessionTypes';

interface PresentAiActionsOptions {
	result: SessionAiTurnResult;
	previousSnapshot: SessionSnapshot;
	activePlayerId: SessionPlayerId;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addResolutionLog: (resolution: ActionResolution) => void;
	resourceKeys: readonly SessionResourceKey[];
	fallbackRegistries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
}

function clonePlayerSnapshot(snapshot: PlayerSnapshot): PlayerSnapshot {
	return {
		resources: { ...snapshot.resources },
		stats: { ...snapshot.stats },
		population: { ...snapshot.population },
		buildings: [...snapshot.buildings],
		lands: snapshot.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsMax,
			slotsUsed: land.slotsUsed,
			developments: [...land.developments],
		})),
		passives: snapshot.passives.map((entry) => ({ ...entry })),
	};
}

async function presentAiActions({
	result,
	previousSnapshot,
	activePlayerId,
	showResolution,
	addResolutionLog,
	resourceKeys,
	fallbackRegistries,
}: PresentAiActionsOptions) {
	if (result.actions.length === 0) {
		return;
	}
	const registries = result.registries ?? fallbackRegistries;
	const { translationContext, diffContext } = createSessionTranslationContext({
		snapshot: result.snapshot,
		ruleSnapshot: result.snapshot.rules,
		passiveRecords: result.snapshot.passiveRecords,
		registries,
	});
	const beforePlayer = previousSnapshot.game.players.find(
		(player) => player.id === activePlayerId,
	);
	const afterPlayer = result.snapshot.game.players.find(
		(player) => player.id === activePlayerId,
	);
	const afterSnapshot = afterPlayer ? snapshotPlayer(afterPlayer) : null;
	let workingBefore: PlayerSnapshot | null = beforePlayer
		? snapshotPlayer(beforePlayer)
		: null;
	if (!workingBefore) {
		const firstTraceBefore = result.actions[0]?.traces[0]?.before;
		if (firstTraceBefore) {
			workingBefore = snapshotPlayer(firstTraceBefore);
		}
	}
	if (!workingBefore && afterSnapshot) {
		workingBefore = clonePlayerSnapshot(afterSnapshot);
	}
	if (!workingBefore) {
		return;
	}
	const resolvedPlayerId: SessionPlayerId =
		afterPlayer?.id ?? beforePlayer?.id ?? activePlayerId;
	const playerIdentity = {
		id: resolvedPlayerId,
		name: afterPlayer?.name ?? beforePlayer?.name ?? 'AI Controller',
	} satisfies ShowResolutionOptions['player'];
	for (const actionResult of result.actions) {
		const stepDefinition = translationContext.actions.get(
			actionResult.actionId,
		);
		if (!stepDefinition) {
			continue;
		}
		const action: Action = {
			id: actionResult.actionId,
			name:
				typeof stepDefinition.name === 'string'
					? stepDefinition.name
					: actionResult.actionId,
		};
		const primaryTrace =
			actionResult.traces[actionResult.traces.length - 1] ??
			actionResult.traces[0];
		const beforeState = primaryTrace?.before
			? snapshotPlayer(primaryTrace.before)
			: clonePlayerSnapshot(workingBefore);
		const afterState = primaryTrace?.after
			? snapshotPlayer(primaryTrace.after)
			: afterSnapshot
				? clonePlayerSnapshot(afterSnapshot)
				: clonePlayerSnapshot(beforeState);
		const resolution = buildActionResolution({
			actionId: actionResult.actionId,
			actionDefinition: stepDefinition,
			...(actionResult.params ? { params: actionResult.params } : {}),
			traces: actionResult.traces,
			costs: actionResult.costs,
			before: beforeState,
			after: afterState,
			translationContext,
			diffContext,
			resourceKeys,
			resources: registries.resources,
		});
		const actionMeta = buildResolutionActionMeta(
			action,
			stepDefinition,
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
			timeline: resolution.timeline,
			source,
			player: playerIdentity,
			actorLabel: 'Played by',
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
				player: playerIdentity,
				actorLabel: 'Played by',
			});
			addResolutionLog(snapshot);
		}
		workingBefore = clonePlayerSnapshot(afterState);
	}
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
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addResolutionLog: (resolution: ActionResolution) => void;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
	resourceKeys: readonly SessionResourceKey[];
	actionCostResource: SessionResourceKey;
	onFatalSessionError?: (error: unknown) => void;
}

export function useAiRunner({
	sessionId,
	sessionSnapshot,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	showResolution,
	addResolutionLog,
	registries,
	resourceKeys,
	actionCostResource,
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
			const enqueueActionPhaseRun = () => {
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
			try {
				let latestSnapshot = sessionSnapshot;
				while (mountedRef.current) {
					const priorSnapshot = latestSnapshot;
					let result: SessionAiTurnResult;
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
					latestSnapshot = result.snapshot;
					if (!result.ranTurn) {
						break;
					}
					if (!mountedRef.current) {
						break;
					}
					try {
						await presentAiActions({
							result,
							previousSnapshot: priorSnapshot,
							activePlayerId: activeId,
							showResolution,
							addResolutionLog,
							resourceKeys,
							fallbackRegistries: registries,
						});
					} catch (error) {
						forwardFatalError(error);
						break;
					}
					if (fatalError !== null) {
						break;
					}
					if (result.phaseComplete) {
						enqueueActionPhaseRun();
						break;
					}
					if (result.actions.length === 0) {
						const nextActivePlayerId = result.snapshot.game.activePlayerId;
						const nextActivePlayer = result.snapshot.game.players.find(
							(player) => player.id === nextActivePlayerId,
						);
						const nextPhaseDefinition =
							result.snapshot.phases[result.snapshot.game.phaseIndex];
						if (nextActivePlayer?.aiControlled && nextPhaseDefinition?.action) {
							const remainingResource =
								nextActivePlayer.resources[actionCostResource] ?? 0;
							if (remainingResource <= 0) {
								enqueueActionPhaseRun();
							}
						}
						break;
					}
				}
			} catch (error) {
				forwardFatalError(error);
			} finally {
				runningRef.current = false;
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
		showResolution,
		addResolutionLog,
		registries,
		resourceKeys,
		actionCostResource,
		onFatalSessionError,
	]);
}
