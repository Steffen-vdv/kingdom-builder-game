import { useCallback, useEffect, useRef } from 'react';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import { ActionId } from '@kingdom-builder/contents';
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
	ensureTimelineLines,
	filterActionDiffChanges,
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
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import { GameApiError } from '../services/gameApi';

type ActionRequirementFailures =
	ActionExecuteErrorResponse['requirementFailures'];
type ActionExecutionError = Error & {
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: ActionRequirementFailures;
};
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

type LegacyTranslationContext = ReturnType<
	typeof getLegacySessionContext
>['translationContext'];

const fatalSessionErrorMarker: unique symbol = Symbol('fatal-session-error');
type FatalSessionErrorMarker = { [fatalSessionErrorMarker]?: boolean };

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
			let context: LegacyTranslationContext | undefined;
			const activePlayerId = snapshotBefore.game.activePlayerId;
			const playerBefore = snapshotBefore.game.players.find(
				(entry) => entry.id === activePlayerId,
			);
			if (!playerBefore) {
				throw new Error('Missing active player before action');
			}
			const before = snapshotPlayer(playerBefore);
			const handleFailure = (
				error: unknown,
				options: {
					translationContext?: LegacyTranslationContext;
					reason?: 'context' | 'action';
				} = {},
			) => {
				const failure = error as ActionExecutionError;
				const activeContext = options.translationContext ?? context;
				const icon = activeContext?.actions?.get?.(action.id)?.icon ?? '';
				let message = failure.message || 'Action failed';
				const { requirementFailure, requirementFailures } = failure;
				const hasRequirementFailure = Boolean(
					requirementFailure ||
						(Array.isArray(requirementFailures) &&
							requirementFailures.length > 0),
				);
				if (requirementFailure && activeContext) {
					message = translateRequirementFailure(
						requirementFailure,
						activeContext,
					);
				}
				pushErrorToast(message);
				addLog(`Failed to play ${icon} ${action.name}: ${message}`, {
					id: playerBefore.id,
					name: playerBefore.name,
				});
				const isSessionMissing =
					typeof failure.message === 'string' &&
					failure.message.startsWith('Session not found:');
				const shouldNotifyFatal =
					options.reason === 'context' ||
					!hasRequirementFailure ||
					error instanceof GameApiError ||
					isSessionMissing;
				if (shouldNotifyFatal && onFatalSessionError) {
					if (error && typeof error === 'object') {
						const marker = error as FatalSessionErrorMarker;
						if (marker[fatalSessionErrorMarker]) {
							return;
						}
						marker[fatalSessionErrorMarker] = true;
					}
					onFatalSessionError(error);
				}
			};
			try {
				context = getLegacySessionContext({
					snapshot: snapshotBefore,
					ruleSnapshot: snapshotBefore.rules,
					passiveRecords: snapshotBefore.passiveRecords,
					registries,
				}).translationContext;
			} catch (error) {
				handleFailure(error, { reason: 'context' });
				return;
			}
			try {
				const response = await performSessionAction({
					sessionId,
					actionId: action.id,
					...(params ? { params } : {}),
				});
				if (response.status === 'error') {
					const failure = new Error(response.error) as ActionExecutionError;
					if (response.requirementFailure) {
						failure.requirementFailure = response.requirementFailure;
					}
					if (response.requirementFailures) {
						failure.requirementFailures = response.requirementFailures;
					}
					throw failure;
				}
				const { costs = {}, traces, snapshot: snapshotAfter } = response;
				let legacyContext: ReturnType<typeof getLegacySessionContext>;
				try {
					legacyContext = getLegacySessionContext({
						snapshot: snapshotAfter,
						ruleSnapshot: snapshotAfter.rules,
						passiveRecords: snapshotAfter.passiveRecords,
						registries,
					});
				} catch (contextError) {
					handleFailure(contextError, { reason: 'context' });
					return;
				}
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
				handleFailure(error, { reason: 'action' });
				return;
			}
		},
		[
			addLog,
			endTurn,
			mountedRef,
			onFatalSessionError,
			registries,
			sessionId,
			pushErrorToast,
			refresh,
			resourceKeys,
			session,
			showResolution,
			syncPhaseState,
			actionCostResource,
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
