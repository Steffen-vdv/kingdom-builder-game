import { useCallback, useEffect, useRef } from 'react';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import { ActionId } from '@kingdom-builder/contents';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import {
	diffStepSnapshots,
	logContent,
	snapshotPlayer,
	translateRequirementFailure,
} from '../translation';
import {
	appendSubActionChanges,
	buildActionCostLines,
	createActionExecutionError,
	filterActionDiffChanges,
	markFatalSessionError,
} from './useActionPerformer.helpers';
import type { FatalActionExecutionError } from './useActionPerformer.helpers';
import type { Action } from './actionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import {
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { getLegacySessionContext } from './getLegacySessionContext';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import { GameApiError } from '../services/gameApi';
import { performSessionAction } from './sessionSdk';
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
function ensureTimelineLines(
	entries: readonly (string | ActionLogLineDescriptor)[],
): ActionLogLineDescriptor[] {
	const lines: ActionLogLineDescriptor[] = [];
	for (const [index, entry] of entries.entries()) {
		if (typeof entry === 'string') {
			const text = entry.trim();
			if (!text) {
				continue;
			}
			lines.push({
				text,
				depth: index === 0 ? 0 : 1,
				kind: index === 0 ? 'headline' : 'effect',
			});
			continue;
		}
		lines.push(entry);
	}
	return lines;
}

interface UseActionPerformerOptions {
	session: LegacySession;
	sessionId: string;
	actionCostResource: SessionResourceKey;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'resources' | 'populations'
	>;
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	refresh: () => void;
	pushErrorToast: (message: string, title?: string) => void;
	mountedRef: React.MutableRefObject<boolean>;
	endTurn: () => Promise<void>;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	resourceKeys: SessionResourceKey[];
	onFatalSessionError?: (error: unknown) => void;
}
export function useActionPerformer({
	session,
	sessionId,
	actionCostResource,
	registries,
	addLog,
	showResolution,
	syncPhaseState,
	refresh,
	pushErrorToast,
	mountedRef,
	endTurn,
	enqueue,
	resourceKeys,
	onFatalSessionError,
}: UseActionPerformerOptions) {
	const perform = useCallback(
		async (action: Action, params?: ActionParametersPayload) => {
			const snapshotBefore = session.getSnapshot();
			if (snapshotBefore.game.conclusion) {
				pushErrorToast('The battle is already decided.');
				return;
			}
			let contextWrapper: ReturnType<typeof getLegacySessionContext>;
			try {
				contextWrapper = getLegacySessionContext({
					snapshot: snapshotBefore,
					ruleSnapshot: snapshotBefore.rules,
					passiveRecords: snapshotBefore.passiveRecords,
					registries,
				});
			} catch (contextError) {
				if (onFatalSessionError) {
					onFatalSessionError(markFatalSessionError(contextError));
				}
				return;
			}
			let { translationContext: context } = contextWrapper;
			const activePlayerId = snapshotBefore.game.activePlayerId;
			const playerBefore = snapshotBefore.game.players.find(
				(entry) => entry.id === activePlayerId,
			);
			if (!playerBefore) {
				throw new Error('Missing active player before action');
			}
			const before = snapshotPlayer(playerBefore);
			try {
				const response = await performSessionAction({
					sessionId,
					actionId: action.id,
					...(params ? { params } : {}),
				});
				if (response.status === 'error') {
					throw createActionExecutionError(response);
				}
				const costs = response.costs ?? {};
				const traces = response.traces;
				const snapshotAfter = response.snapshot;
				const legacyContext = (() => {
					try {
						return getLegacySessionContext({
							snapshot: snapshotAfter,
							ruleSnapshot: snapshotAfter.rules,
							passiveRecords: snapshotAfter.passiveRecords,
							registries,
						});
					} catch (contextError) {
						throw markFatalSessionError(contextError);
					}
				})();
				const { translationContext, diffContext } = legacyContext;
				context = translationContext;
				const playerAfter = snapshotAfter.game.players.find(
					(entry) => entry.id === activePlayerId,
				);
				if (!playerAfter) {
					throw new Error('Missing active player after action');
				}
				const after = snapshotPlayer(playerAfter);
				const stepDef = context.actions.get(action.id);
				const resolvedStep = resolveActionEffects(stepDef, params);
				const changes = diffStepSnapshots(
					before,
					after,
					resolvedStep,
					diffContext,
					resourceKeys,
				);
				const rawMessages = logContent('action', action.id, context, params);
				const messages = ensureTimelineLines(rawMessages);
				const logHeadline = messages[0]?.text;
				const costLines = buildActionCostLines({
					costs,
					beforeResources: before.resources,
					resources: registries.resources,
				});
				if (costLines.length) {
					const header: ActionLogLineDescriptor = {
						text: '💲 Action cost',
						depth: 1,
						kind: 'cost',
					};
					messages.splice(1, 0, header, ...costLines);
				}
				const subLines = appendSubActionChanges({
					traces,
					context,
					diffContext,
					resourceKeys,
					messages,
				});
				const filtered = filterActionDiffChanges({
					changes,
					messages,
					subLines,
				});
				const logLines = (
					action.id === ActionId.develop
						? formatDevelopActionLogLines
						: formatActionLogLines
				)(messages, filtered);
				const actionMeta = buildResolutionActionMeta(
					action,
					stepDef,
					logHeadline,
				);
				const resolutionSource = {
					kind: 'action' as const,
					label: 'Action',
					id: actionMeta.id,
					name: actionMeta.name,
					icon: actionMeta.icon ?? '',
				};
				const resolutionPlayer = {
					id: playerAfter.id,
					name: playerAfter.name,
				};
				syncPhaseState(snapshotAfter);
				refresh();
				try {
					await showResolution({
						action: actionMeta,
						lines: logLines,
						player: resolutionPlayer,
						summaries: filtered,
						source: resolutionSource,
						actorLabel: 'Played by',
					});
				} catch (_error) {
					addLog(logLines, resolutionPlayer);
				}
				if (!mountedRef.current) {
					return;
				}
				if (snapshotAfter.game.conclusion) {
					return;
				}
				if (
					snapshotAfter.game.devMode &&
					(playerAfter.resources[actionCostResource] ?? 0) <= 0
				) {
					await endTurn();
				}
			} catch (error) {
				const icon = context.actions.get(action.id)?.icon || '';
				const actionError = error as FatalActionExecutionError;
				const requirementFailure = actionError?.requirementFailure;
				const requirementFailures = actionError?.requirementFailures;
				const hasRequirementFailures =
					Boolean(requirementFailure) ||
					(Array.isArray(requirementFailures) &&
						requirementFailures.length > 0);
				const isSessionNotFound =
					error instanceof Error &&
					error.message.startsWith('Session not found');
				const isFatal =
					!hasRequirementFailures ||
					error instanceof GameApiError ||
					isSessionNotFound ||
					actionError?.fatalSessionError === true;
				if (isFatal) {
					if (onFatalSessionError) {
						onFatalSessionError(error);
					}
					return;
				}
				let message = (error as Error).message || 'Action failed';
				if (requirementFailure) {
					message = translateRequirementFailure(requirementFailure, context);
				} else if (
					Array.isArray(requirementFailures) &&
					requirementFailures.length > 0
				) {
					const [firstRequirementFailure] = requirementFailures;
					if (firstRequirementFailure) {
						message = translateRequirementFailure(
							firstRequirementFailure,
							context,
						);
					}
				}
				pushErrorToast(message);
				const failureLog = `Failed to play ${icon} ${action.name}: ${message}`;
				addLog(failureLog, {
					id: playerBefore.id,
					name: playerBefore.name,
				});
				return;
			}
		},
		[
			addLog,
			endTurn,
			mountedRef,
			registries,
			sessionId,
			pushErrorToast,
			refresh,
			resourceKeys,
			session,
			showResolution,
			syncPhaseState,
			actionCostResource,
			onFatalSessionError,
		],
	);
	const handlePerform = useCallback(
		(action: Action, params?: ActionParametersPayload) =>
			enqueue(() => perform(action, params)),
		[enqueue, perform],
	);
	const performRef = useRef<typeof perform>(perform);
	useEffect(() => {
		performRef.current = perform;
	}, [perform]);
	return { handlePerform, performRef };
}
