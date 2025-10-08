import { useCallback, useEffect, useRef } from 'react';
import {
	resolveActionEffects,
	type ActionParams,
	type EngineSession,
	type PlayerStateSnapshot,
	type RequirementFailure,
} from '@kingdom-builder/engine';
import {
	ActionId,
	RESOURCES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import {
	diffStepSnapshots,
	logContent,
	snapshotPlayer,
	translateRequirementFailure,
} from '../translation';
import {
	appendSubActionChanges,
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

interface UseActionPerformerOptions {
	session: EngineSession;
	actionCostResource: ResourceKey;
	addLog: (
		entry: string | string[],
		player?: Pick<PlayerStateSnapshot, 'id' | 'name'>,
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
				const traces = session.performAction(action.id, params);
				const snapshotAfter = session.getSnapshot();
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
				const messages = logContent('action', action.id, context, params);
				const logHeadline = messages[0];
				const costLines: string[] = [];
				for (const key of Object.keys(costs) as (keyof typeof RESOURCES)[]) {
					const amt = costs[key] ?? 0;
					if (!amt) {
						continue;
					}
					const info = RESOURCES[key];
					const icon = info?.icon ? `${info.icon} ` : '';
					const label = info?.label ?? key;
					const beforeAmount = before.resources[key] ?? 0;
					const afterAmount = beforeAmount - amt;
					costLines.push(
						`    ${icon}${label} -${amt} (${beforeAmount}→${afterAmount})`,
					);
				}
				if (costLines.length) {
					messages.splice(1, 0, '  💲 Action cost', ...costLines);
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
				const requirementFailure = (
					error as Error & {
						requirementFailure?: RequirementFailure;
					}
				).requirementFailure;
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
			endTurn,
			mountedRef,
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
		(action: Action, params?: ActionParams<string>) =>
			enqueue(() => perform(action, params)),
		[enqueue, perform],
	);

	const performRef = useRef<typeof perform>(perform);
	useEffect(() => {
		performRef.current = perform;
	}, [perform]);

	return { handlePerform, performRef };
}
