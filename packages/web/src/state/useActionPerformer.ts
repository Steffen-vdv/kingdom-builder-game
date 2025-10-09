import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import {
	resolveActionEffects,
	type ActionParams,
	type EngineSession,
	type EngineSessionSnapshot,
	type PlayerStateSnapshot,
	type RequirementFailure,
} from '@kingdom-builder/engine';
import { ActionId, type ResourceKey } from '@kingdom-builder/contents';
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
	sessionId: string;
	session: EngineSession;
	actionCostResource: ResourceKey;
	addLog: (
		entry: string | string[],
		player?: Pick<PlayerStateSnapshot, 'id' | 'name'>,
	) => void;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	updateMainPhaseStep: (apStartOverride?: number) => void;
	refresh: (snapshot?: EngineSessionSnapshot) => void;
	pushErrorToast: (message: string, title?: string) => void;
	mountedRef: React.MutableRefObject<boolean>;
	endTurn: () => Promise<void>;
	resourceKeys: ResourceKey[];
}
type PerformHandler = (
	action: Action,
	params?: ActionParams<string>,
) => Promise<void>;

interface UseActionPerformerResult {
	handlePerform: PerformHandler;
	performRef: MutableRefObject<PerformHandler>;
}
export function useActionPerformer({
	sessionId,
	session,
	actionCostResource,
	addLog,
	showResolution,
	updateMainPhaseStep,
	refresh,
	pushErrorToast,
	mountedRef,
	endTurn,
	resourceKeys,
}: UseActionPerformerOptions): UseActionPerformerResult {
	const perform = useCallback(
		async (action: Action, params?: ActionParams<string>) => {
			const snapshotBefore = session.getSnapshot();
			if (snapshotBefore.game.conclusion) {
				pushErrorToast('The battle is already decided.');
				return;
			}
			let { translationContext: context } = getLegacySessionContext(
				session,
				snapshotBefore,
			);
			const activePlayerId = snapshotBefore.game.activePlayerId;
			const playerBefore = snapshotBefore.game.players.find(
				(entry) => entry.id === activePlayerId,
			);
			if (!playerBefore) {
				throw new Error('Missing active player before action');
			}
			const before = snapshotPlayer(playerBefore);
			const costs = session.getActionCosts(action.id, params);
			try {
				const response = await performSessionAction({
					sessionId,
					actionId: action.id,
					...(params ? { params } : {}),
				});
				if (response.status === 'error') {
					const failure =
						response.requirementFailure ?? response.requirementFailures?.[0];
					let message = response.error;
					if (failure) {
						message = translateRequirementFailure(failure, context);
					}
					const icon = context.actions.get(action.id)?.icon || '';
					pushErrorToast(message);
					addLog(`Failed to play ${icon} ${action.name}: ${message}`, {
						id: playerBefore.id,
						name: playerBefore.name,
					});
					return;
				}
				const snapshotAfter = response.snapshot;
				const traces = response.traces;
				const { translationContext, diffContext } = getLegacySessionContext(
					session,
					snapshotAfter,
				);
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
				refresh(snapshotAfter);
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
			} catch (rawError) {
				const icon = context.actions.get(action.id)?.icon || '';
				let message = 'Action failed';
				let requirementFailure: RequirementFailure | undefined;
				if (rawError instanceof Error) {
					message = rawError.message || message;
					requirementFailure = (
						rawError as {
							requirementFailure?: RequirementFailure;
						}
					).requirementFailure;
				}
				if (requirementFailure) {
					message = translateRequirementFailure(requirementFailure, context);
				}
				pushErrorToast(message);
				addLog(`Failed to play ${icon} ${action.name}: ${message}`, {
					id: playerBefore.id,
					name: playerBefore.name,
				});
				return;
			}
		},
		[
			addLog,
			actionCostResource,
			endTurn,
			mountedRef,
			pushErrorToast,
			refresh,
			resourceKeys,
			session,
			sessionId,
			showResolution,
			updateMainPhaseStep,
		],
	);

	const handlePerform = useCallback(
		(action: Action, params?: ActionParams<string>) => perform(action, params),
		[perform],
	);

	const performRef = useRef<PerformHandler>(perform);
	useEffect(() => {
		performRef.current = perform;
	}, [perform]);
	return { handlePerform, performRef };
}
