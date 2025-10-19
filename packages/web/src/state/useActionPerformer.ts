import { useCallback, useEffect, useRef } from 'react';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { diffStepSnapshots, logContent, snapshotPlayer } from '../translation';
import {
	appendSubActionChanges,
	buildActionCostLines,
	ensureTimelineLines,
	filterActionDiffChanges,
	handleMissingActionDefinition,
	presentResolutionOrLog,
} from './useActionPerformer.helpers';
import { createFailureResolutionSnapshot } from './actionResolutionLog';
import { createActionErrorHandler } from './useActionErrorHandler';
import type { Action } from './actionTypes';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';
import {
	buildActionLogTimeline,
	buildDevelopActionLogTimeline,
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import { performSessionAction } from './sessionSdk';
import { markFatalSessionError, isFatalSessionError } from './sessionErrors';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import { LOG_KEYWORDS } from '../translation/log/logMessages';
import { getSessionSnapshot } from './sessionStateStore';
import { createActionExecutionError } from './actionExecutionError';
import { createActionErrorMetadataEnsurer } from './createActionErrorMetadataEnsurer';

interface UseActionPerformerOptions {
	sessionId: string;
	actionCostResource: SessionResourceKey;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'resources' | 'populations'
	>;
	addResolutionLog: (resolution: ActionResolution) => void;
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
	sessionId,
	actionCostResource,
	registries,
	addResolutionLog,
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
			const notifyFatal = (error: unknown) => {
				if (!isFatalSessionError(error)) {
					markFatalSessionError(error);
				}
				if (onFatalSessionError) {
					onFatalSessionError(error);
				}
			};
			const fatalErrorRef: { current: unknown } = { current: null };
			const throwFatal = (error: unknown): never => {
				fatalErrorRef.current = error;
				notifyFatal(error);
				throw error;
			};
			const ensureValue = <T>(
				value: T | undefined,
				createError: () => Error,
			): T => value ?? throwFatal(createError());
			const snapshotBefore = getSessionSnapshot(sessionId);
			if (snapshotBefore.game.conclusion) {
				pushErrorToast('The battle is already decided.');
				return;
			}
			let { translationContext: context } = createSessionTranslationContext({
				snapshot: snapshotBefore,
				ruleSnapshot: snapshotBefore.rules,
				passiveRecords: snapshotBefore.passiveRecords,
				registries,
			});
			const contextRef = { current: context };
			const activePlayerId = snapshotBefore.game.activePlayerId;
			const playerBefore = ensureValue(
				snapshotBefore.game.players.find(
					(entry) => entry.id === activePlayerId,
				),
				() => new Error('Missing active player before action'),
			);
			const before = snapshotPlayer(playerBefore);
			const baseMetadataContext = {
				sessionId,
				action: { id: action.id, name: action.name },
				params,
				player: { id: playerBefore.id, name: playerBefore.name },
				playerSnapshot: before,
			};
			const ensureActionMetadata = createActionErrorMetadataEnsurer(
				{
					sessionId,
					actionId: action.id,
					...(params ? { params } : {}),
				},
				baseMetadataContext,
			);
			const addLog = (
				entry: string | string[],
				player: Pick<SessionPlayerStateSnapshot, 'id' | 'name'> = playerBefore,
			): void => {
				const lines = Array.isArray(entry) ? entry : [entry];
				const normalized = lines
					.map((line) => (line ? `${line}`.trim() : ''))
					.filter((line): line is string => Boolean(line));
				if (!normalized.length) {
					return;
				}
				const [headline, ...rest] = normalized;
				const headlineText = headline || 'Action failed';
				const detailText = rest.length ? rest.join('\n') : headlineText;
				const resolutionSnapshot = createFailureResolutionSnapshot({
					action,
					stepDefinition: contextRef.current.actions.get(action.id),
					player,
					detail: detailText,
					headline: headlineText,
				});
				addResolutionLog(resolutionSnapshot);
			};
			const handleError = createActionErrorHandler({
				fatalErrorRef,
				notifyFatal,
				contextRef,
				action,
				player: playerBefore,
				pushErrorToast,
				addLog,
			});
			try {
				const response = await performSessionAction(
					{
						sessionId,
						actionId: action.id,
						...(params ? { params } : {}),
					},
					undefined,
					{ skipQueue: true },
				);
				if (response.status === 'error') {
					ensureActionMetadata(response, { error: response.error });
					const failure = createActionExecutionError(response);
					ensureActionMetadata(failure, { error: response.error });
					if (response.fatal) {
						throwFatal(failure);
					}
					throw failure;
				}
				const costs = response.costs ?? {};
				const traces = response.traces;
				const snapshotAfter = getSessionSnapshot(sessionId);
				const { translationContext: updatedContext, diffContext } =
					createSessionTranslationContext({
						snapshot: snapshotAfter,
						ruleSnapshot: snapshotAfter.rules,
						passiveRecords: snapshotAfter.passiveRecords,
						registries,
					});
				context = updatedContext;
				contextRef.current = context;
				const playerAfter = ensureValue(
					snapshotAfter.game.players.find(
						(entry) => entry.id === activePlayerId,
					),
					() => new Error('Missing active player after action'),
				);
				const after = snapshotPlayer(playerAfter);
				const stepDef = context.actions.get(action.id);
				if (!stepDef) {
					await handleMissingActionDefinition({
						action,
						player: playerAfter,
						snapshot: snapshotAfter,
						actionCostResource,
						showResolution,
						addResolutionLog,
						syncPhaseState,
						refresh,
						mountedRef,
						endTurn,
					});
					return;
				}
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
				syncPhaseState(snapshotAfter);
				refresh();
				void presentResolutionOrLog({
					action: buildResolutionActionMeta(action, stepDef, logHeadline),
					logLines,
					summaries: filtered,
					player: {
						id: playerAfter.id,
						name: playerAfter.name,
					},
					showResolution,
					addResolutionLog,
					timeline,
				})
					.then(() => {
						if (
							!mountedRef.current ||
							snapshotAfter.game.conclusion ||
							!snapshotAfter.game.devMode ||
							(playerAfter.resources[actionCostResource] ?? 0) > 0
						) {
							return;
						}
						return endTurn();
					})
					.catch((error) => {
						void handleError(error);
					});
			} catch (error) {
				ensureActionMetadata(error, {
					message: error instanceof Error ? error.message : undefined,
				});
				if (handleError(error)) {
					throw error;
				}
			}
		},
		[
			addResolutionLog,
			endTurn,
			mountedRef,
			registries,
			sessionId,
			pushErrorToast,
			refresh,
			resourceKeys,
			showResolution,
			syncPhaseState,
			actionCostResource,
			onFatalSessionError,
		],
	);
	const handlePerform = useCallback(
		(action: Action, params?: ActionParametersPayload) =>
			enqueue(() =>
				perform(action, params).catch((error) => {
					if (isFatalSessionError(error)) {
						return;
					}
					throw error;
				}),
			),
		[enqueue, perform],
	);
	const performRef = useRef<typeof handlePerform>(handlePerform);

	useEffect(() => {
		performRef.current = handlePerform;
	}, [handlePerform]);

	return { handlePerform, performRef };
}
