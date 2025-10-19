import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { diffStepSnapshots, logContent, snapshotPlayer } from '../translation';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import { ensureTimelineLines } from './useActionPerformer.helpers';
import { formatActionLogLines } from './actionLogFormat';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type {
	SessionAdapter,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import type { ShowResolutionOptions } from './useActionResolution';
import { isFatalSessionError, markFatalSessionError } from './sessionErrors';

interface ActionResolvedLogEntry {
	playerId?: unknown;
	actionId?: unknown;
	params?: unknown;
}

interface ResolvedActionDetails {
	id: string;
	params?: Record<string, unknown>;
}

function extractResolvedAction(
	snapshot: SessionSnapshot,
	playerId: string,
): ResolvedActionDetails | null {
	const entries = snapshot.metadata.effectLogs?.['action:resolved'];
	if (!Array.isArray(entries)) {
		return null;
	}
	for (let index = entries.length - 1; index >= 0; index -= 1) {
		const entry = entries[index] as ActionResolvedLogEntry | undefined;
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		if (typeof entry.playerId !== 'string' || entry.playerId !== playerId) {
			continue;
		}
		const { actionId, params } = entry;
		if (typeof actionId !== 'string' || actionId.length === 0) {
			continue;
		}
		const normalizedParams =
			params && typeof params === 'object'
				? (params as Record<string, unknown>)
				: undefined;
		const details: ResolvedActionDetails = { id: actionId };
		if (normalizedParams) {
			details.params = normalizedParams;
		}
		return details;
	}
	return null;
}

interface UseAiRunnerOptions {
	session: SessionAdapter;
	sessionState: SessionSnapshot;
	runUntilActionPhaseCore: () => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	mountedRef: MutableRefObject<boolean>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	resourceKeys: SessionResourceKey[];
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
	onFatalSessionError?: (error: unknown) => void;
}

export function useAiRunner({
	session,
	sessionState,
	runUntilActionPhaseCore,
	syncPhaseState,
	mountedRef,
	showResolution,
	resourceKeys,
	registries,
	onFatalSessionError,
}: UseAiRunnerOptions) {
	useEffect(() => {
		const phaseDefinition = sessionState.phases[sessionState.game.phaseIndex];
		if (!phaseDefinition?.action) {
			return;
		}
		if (sessionState.game.conclusion) {
			return;
		}
		const activeId = sessionState.game.activePlayerId;
		if (!session.hasAiController(activeId)) {
			return;
		}
		void session.enqueue(async () => {
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
			const snapshotBefore = session.getSnapshot();
			const aiPlayerBefore = snapshotBefore.game.players.find(
				(player) => player.id === activeId,
			);
			let resolutionOptions: ShowResolutionOptions | null = null;
			try {
				const ranTurn = await session.runAiTurn(activeId);
				if (ranTurn && aiPlayerBefore) {
					try {
						const snapshotAfter = session.getSnapshot();
						const aiPlayerAfter = snapshotAfter.game.players.find(
							(player) => player.id === activeId,
						);
						if (aiPlayerAfter) {
							const resolvedAction = extractResolvedAction(
								snapshotAfter,
								aiPlayerAfter.id,
							);
							const { translationContext, diffContext } =
								createSessionTranslationContext({
									snapshot: snapshotAfter,
									ruleSnapshot: snapshotAfter.rules,
									passiveRecords: snapshotAfter.passiveRecords,
									registries,
								});
							const actionId = resolvedAction?.id;
							const baseMessages = ensureTimelineLines(
								actionId
									? logContent(
											'action',
											actionId,
											translationContext,
											resolvedAction?.params,
										)
									: [],
							);
							const actionDefinition = actionId
								? registries.actions.get(actionId)
								: undefined;
							const timeline =
								baseMessages.length > 0
									? baseMessages
									: ensureTimelineLines([
											`Played ${
												actionDefinition?.name ?? (actionId || 'Action')
											}`,
										]);
							const changes = diffStepSnapshots(
								snapshotPlayer(aiPlayerBefore),
								snapshotPlayer(aiPlayerAfter),
								undefined,
								diffContext,
								resourceKeys,
							);
							const lines = formatActionLogLines(timeline, changes);
							if (lines.length > 0) {
								const actionMeta = actionId
									? {
											id: actionId,
											name: actionDefinition?.name ?? actionId,
											...(actionDefinition?.icon
												? {
														icon: actionDefinition.icon,
													}
												: {}),
										}
									: undefined;
								const sourceMeta = actionId
									? {
											kind: 'action' as const,
											label: 'Action',
											id: actionId,
											name: actionDefinition?.name ?? actionId,
											...(actionDefinition?.icon
												? {
														icon: actionDefinition.icon,
													}
												: {}),
										}
									: 'action';
								resolutionOptions = {
									...(actionMeta ? { action: actionMeta } : {}),
									lines,
									player: {
										id: aiPlayerAfter.id,
										name: aiPlayerAfter.name,
									},
									summaries: changes,
									source: sourceMeta,
									actorLabel: 'Played by',
								} satisfies ShowResolutionOptions;
							}
						}
					} catch (error) {
						forwardFatalError(error);
					}
				}
				if (!ranTurn || fatalError !== null) {
					if (ranTurn && mountedRef.current && fatalError === null) {
						syncPhaseState(session.getSnapshot());
					}
					return;
				}
				if (resolutionOptions) {
					try {
						await showResolution(resolutionOptions);
					} catch (error) {
						forwardFatalError(error);
					}
				}
				if (!mountedRef.current) {
					syncPhaseState(session.getSnapshot());
					return;
				}
				try {
					syncPhaseState(session.getSnapshot(), {
						isAdvancing: true,
						canEndTurn: false,
					});
					await runUntilActionPhaseCore();
				} catch (error) {
					forwardFatalError(error);
				}
			} catch (error) {
				forwardFatalError(error);
			}
			if (fatalError !== null) {
				return;
			}
		});
	}, [
		session,
		sessionState.game.activePlayerId,
		sessionState.game.phaseIndex,
		sessionState.phases,
		runUntilActionPhaseCore,
		syncPhaseState,
		mountedRef,
		showResolution,
		resourceKeys,
		registries,
		onFatalSessionError,
	]);
}
