import { useCallback, useEffect, useRef } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { snapshotPlayer } from '../translation';
import { buildActionResolution } from './buildActionResolution';
import {
	handleMissingActionDefinition,
	presentResolutionOrLog,
} from './useActionPerformer.helpers';
import { createActionErrorHandler } from './useActionErrorHandler';
import type { Action } from './actionTypes';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';
import {
	buildResolutionActionMeta,
	type ResolutionActionCategory,
} from './deriveResolutionActionName';
import {
	extractActionCategoryId,
	resolveActionCategoryDefinition,
} from '../utils/resolveActionCategory';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import { performSessionAction } from './sessionSdk';
import { markFatalSessionError, isFatalSessionError } from './sessionErrors';
import {
	getActionErrorMetadata,
	setActionErrorMetadata,
} from './actionErrorMetadata';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import { getSessionSnapshot } from './sessionStateStore';
import { createActionExecutionError } from './actionExecutionError';
interface UseActionPerformerOptions {
	sessionId: string;
	actionCostResource: SessionResourceKey;
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'buildings'
		| 'developments'
		| 'resources'
		| 'populations'
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
			const handleError = createActionErrorHandler({
				fatalErrorRef,
				notifyFatal,
				contextRef,
				action,
				player: playerBefore,
				pushErrorToast,
				addResolutionLog,
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
					if (response.fatal) {
						throwFatal(createActionExecutionError(response));
					}
					throw createActionExecutionError(response);
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
				const categoryId = extractActionCategoryId(stepDef);
				const categoryDefinition: ResolutionActionCategory | undefined =
					resolveActionCategoryDefinition(context.actionCategories, categoryId);
				const resolution = buildActionResolution({
					actionId: action.id,
					actionDefinition: stepDef,
					...(params ? { params } : {}),
					traces,
					costs,
					before,
					after,
					translationContext: context,
					diffContext,
					resourceKeys,
					resources: registries.resources,
				});
				const { timeline, logLines, summaries, headline } = resolution;
				syncPhaseState(snapshotAfter);
				refresh();
				void presentResolutionOrLog({
					action: buildResolutionActionMeta(
						action,
						stepDef,
						headline,
						categoryDefinition,
					),
					logLines,
					summaries,
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
				if (handleError(error)) {
					throw error;
				}
				if (!error || typeof error !== 'object') {
					return;
				}
				const metadata = getActionErrorMetadata(error);
				const contextDetails = {
					...(metadata?.context ?? {}),
					action: {
						id: action.id,
						name: action.name,
						definition: contextRef.current.actions.get(action.id),
					},
					params: params ?? null,
					player: {
						before: {
							id: playerBefore.id,
							name: playerBefore.name,
						},
					},
					snapshot: snapshotBefore,
				};
				setActionErrorMetadata(error, {
					...(metadata ?? {
						request: {
							sessionId,
							actionId: action.id,
							...(params ? { params } : {}),
						},
					}),
					context: contextDetails,
				});
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
