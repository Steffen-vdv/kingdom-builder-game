import { useCallback, useEffect, useRef } from 'react';
import {
	resolveActionEffects,
	type ActionParams,
	type EngineSession,
	type PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import { ActionId, type ResourceKey } from '@kingdom-builder/contents';
import { diffStepSnapshots, logContent, snapshotPlayer } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { Action } from './actionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import {
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import {
	buildActionDiffContext,
	buildCostLines,
	collectSubActionChanges,
	filterActionChanges,
	resolveActionDefinition,
} from './useActionPerformer.helpers';

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
	translationContext: TranslationContext;
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
	translationContext,
}: UseActionPerformerOptions) {
	const perform = useCallback(
		async (action: Action, params?: ActionParams<string>) => {
			const resolveDefinition = (id: string) =>
				resolveActionDefinition(translationContext, id);
			const snapshotBefore = session.getSnapshot();
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
				const playerAfter = snapshotAfter.game.players.find(
					(entry) => entry.id === activePlayerId,
				);
				if (!playerAfter) {
					throw new Error('Missing active player after action');
				}
				const after = snapshotPlayer(playerAfter);
				const diffPlayer = { ...after, id: playerAfter.id };
				const stepDef = resolveDefinition(action.id);
				if (!stepDef) {
					throw new Error(`Missing definition for action ${action.id}`);
				}
				const resolvedStep = resolveActionEffects(stepDef, params);
				const diffContext = buildActionDiffContext(
					translationContext,
					session,
					diffPlayer,
				);
				const changes = diffStepSnapshots(
					before,
					after,
					resolvedStep,
					diffContext,
					resourceKeys,
				);
				const messages = logContent(
					'action',
					action.id,
					translationContext,
					params,
				);
				const logHeadline = messages[0];
				const costLines = buildCostLines(costs, before);
				if (costLines.length) {
					messages.splice(1, 0, '  💲 Action cost', ...costLines);
				}

				const subLines = collectSubActionChanges({
					traces,
					diffContext,
					resourceKeys,
					messages,
					resolveDefinition,
				});
				const filtered = filterActionChanges({
					changes,
					messages,
					subLines,
					costs,
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
				if (
					snapshotAfter.game.devMode &&
					(playerAfter.resources[actionCostResource] ?? 0) <= 0
				) {
					await endTurn();
				}
			} catch (error) {
				const actionIcon = resolveDefinition(action.id)?.icon || '';
				const message = (error as Error).message || 'Action failed';
				pushErrorToast(message);
				addLog(`Failed to play ${actionIcon} ${action.name}: ${message}`, {
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
			translationContext,
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
