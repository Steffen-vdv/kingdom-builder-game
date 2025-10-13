import { useCallback, useEffect, useRef } from 'react';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import type {
	ActionExecuteErrorResponse,
	ActionParametersPayload,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionPlayerStateSnapshot,
	SessionRequirementFailure,
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
	filterActionDiffChanges,
	handleMissingActionDefinition,
	presentResolutionOrLog,
} from './useActionPerformer.helpers';
import type { Action } from './actionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import {
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { getLegacySessionContext } from './getLegacySessionContext';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import { performSessionAction } from './sessionSdk';
import {
	SessionMirroringError,
	markFatalSessionError,
	isFatalSessionError,
} from './sessionErrors';
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import { LOG_KEYWORDS } from '../translation/log/logMessages';

type ActionRequirementFailures =
	ActionExecuteErrorResponse['requirementFailures'];
type ActionExecutionError = Error & {
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: ActionRequirementFailures;
};

function createActionExecutionError(
	response: ActionExecuteErrorResponse,
): ActionExecutionError {
	const failure = new Error(response.error) as ActionExecutionError;
	if (response.requirementFailure) {
		failure.requirementFailure = response.requirementFailure;
	}
	if (response.requirementFailures) {
		failure.requirementFailures = response.requirementFailures;
	}
	return failure;
}
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
			const notifyFatal = (error: unknown) => {
				if (!isFatalSessionError(error)) {
					markFatalSessionError(error);
				}
				if (onFatalSessionError) {
					onFatalSessionError(error);
				}
			};
			let fatalError: unknown = null;
			const throwFatal = (error: unknown): never => {
				fatalError = error;
				notifyFatal(error);
				throw error;
			};
			const ensureValue = <T>(
				value: T | undefined,
				createError: () => Error,
			): T => value ?? throwFatal(createError());
			const snapshotBefore = session.getSnapshot();
			if (snapshotBefore.game.conclusion) {
				pushErrorToast('The battle is already decided.');
				return;
			}
			let { translationContext: context } = getLegacySessionContext({
				snapshot: snapshotBefore,
				ruleSnapshot: snapshotBefore.rules,
				passiveRecords: snapshotBefore.passiveRecords,
				registries,
			});
			const activePlayerId = snapshotBefore.game.activePlayerId;
			const playerBefore = ensureValue(
				snapshotBefore.game.players.find(
					(entry) => entry.id === activePlayerId,
				),
				() => new Error('Missing active player before action'),
			);
			const before = snapshotPlayer(playerBefore);
			try {
				const response = await performSessionAction({
					sessionId,
					actionId: action.id,
					...(params ? { params } : {}),
				});
				if (response.status === 'error') {
					if (response.fatal) {
						throwFatal(createActionExecutionError(response));
					}
					throw createActionExecutionError(response);
				}
				const costs = response.costs ?? {};
				const traces = response.traces;
				const snapshotAfter = session.getSnapshot();
				const legacyContext = getLegacySessionContext({
					snapshot: snapshotAfter,
					ruleSnapshot: snapshotAfter.rules,
					passiveRecords: snapshotAfter.passiveRecords,
					registries,
				});
				const { translationContext, diffContext } = legacyContext;
				context = translationContext;
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
						syncPhaseState,
						refresh,
						addLog,
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
				const logLines = (
					useDevelopFormatter
						? formatDevelopActionLogLines
						: formatActionLogLines
				)(messages, filtered);
				const actionMeta = buildResolutionActionMeta(
					action,
					stepDef,
					logHeadline,
				);
				const playerIdentity = {
					id: playerAfter.id,
					name: playerAfter.name,
				};
				syncPhaseState(snapshotAfter);
				refresh();
				await presentResolutionOrLog({
					action: actionMeta,
					logLines,
					summaries: filtered,
					player: playerIdentity,
					showResolution,
					addLog,
				});
				if (!mountedRef.current || snapshotAfter.game.conclusion) {
					return;
				}
				if (
					snapshotAfter.game.devMode &&
					(playerAfter.resources[actionCostResource] ?? 0) <= 0
				) {
					await endTurn();
				}
			} catch (error) {
				if (fatalError !== null || isFatalSessionError(error)) {
					if (fatalError === null) {
						fatalError = error;
						notifyFatal(error);
					}
					throw error;
				}
				if (error instanceof SessionMirroringError) {
					fatalError = error;
					notifyFatal(error);
					throw error;
				}
				const icon = context.actions.get(action.id)?.icon || '';
				let message = (error as Error).message || 'Action failed';
				const executionError = error as ActionExecutionError;
				const requirementFailure =
					executionError?.requirementFailure ??
					executionError?.requirementFailures?.[0];
				if (requirementFailure) {
					message = translateRequirementFailure(requirementFailure, context);
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
