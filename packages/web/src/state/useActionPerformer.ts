import { useCallback, useEffect, useRef } from 'react';
import { type EngineSessionSnapshot } from '@kingdom-builder/engine';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import { ActionId, type ResourceKey } from '@kingdom-builder/contents';
import type {
	ActionExecuteErrorResponse,
	ActionParametersPayload,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionPlayerStateSnapshot,
	SessionRequirementFailure,
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
interface ActionPerformerSession {
	getSnapshot: () => EngineSessionSnapshot;
}

interface UseActionPerformerOptions {
	session: ActionPerformerSession;
	sessionId: string;
	actionCostResource: ResourceKey;
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	updateMainPhaseStep: (apStartOverride?: number) => void;
	refresh: () => void;
	pushErrorToast: (message: string, title?: string) => void;
	mountedRef: React.MutableRefObject<boolean>;
	endTurn: () => Promise<void>;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	resourceKeys: ResourceKey[];
}
export function useActionPerformer({
	session,
	sessionId,
	actionCostResource,
	addLog,
	showResolution,
	updateMainPhaseStep,
	refresh,
	pushErrorToast,
	mountedRef,
	endTurn,
	enqueue,
	resourceKeys,
}: UseActionPerformerOptions) {
	const perform = useCallback(
		async (action: Action, params?: ActionParametersPayload) => {
			const snapshotBefore = session.getSnapshot();
			if (snapshotBefore.game.conclusion) {
				pushErrorToast('The battle is already decided.');
				return;
			}
			let { translationContext: context } = getLegacySessionContext({
				snapshot: snapshotBefore,
				ruleSnapshot: snapshotBefore.rules,
				passiveRecords: snapshotBefore.passiveRecords,
			});
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
				const legacyContext = getLegacySessionContext({
					snapshot: snapshotAfter,
					ruleSnapshot: snapshotAfter.rules,
					passiveRecords: snapshotAfter.passiveRecords,
				});
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
				const resolutionPlayer = {
					id: playerAfter.id,
					name: playerAfter.name,
				};
				updateMainPhaseStep();
				refresh();
				try {
					await showResolution({
						action: actionMeta,
						lines: logLines,
						player: resolutionPlayer,
						summaries: filtered,
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
				let message = (error as Error).message || 'Action failed';
				const requirementFailure = (error as ActionExecutionError)
					?.requirementFailure;
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
			sessionId,
			pushErrorToast,
			refresh,
			resourceKeys,
			session,
			showResolution,
			updateMainPhaseStep,
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
