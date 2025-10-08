import { useCallback, useEffect, useRef } from 'react';
import {
	resolveActionEffects,
	type ActionParams,
	type EngineSession,
	type EngineSessionSnapshot,
	type PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	type ResourceKey,
} from '@kingdom-builder/contents';
import {
	createTranslationContext,
	createTranslationDiffContext,
	snapshotPlayer,
} from '../translation';
import type { Action } from './actionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import { buildActionLogResult } from './useActionPerformer.log';

const TRANSLATION_REGISTRIES = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
} as const;

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
			const buildTranslationContext = (state: EngineSessionSnapshot) =>
				createTranslationContext(state, TRANSLATION_REGISTRIES, {
					pullEffectLog: <T>(key: string) => session.pullEffectLog<T>(key),
					evaluationMods: session.getPassiveEvaluationMods(),
				});
			const snapshotBefore = session.getSnapshot();
			const translationBefore = buildTranslationContext(snapshotBefore);
			const activePlayerId = snapshotBefore.game.activePlayerId;
			const playerBefore = snapshotBefore.game.players.find(
				(entry) => entry.id === activePlayerId,
			);
			if (!playerBefore) {
				throw new Error('Missing active player before action');
			}
			const before = snapshotPlayer(playerBefore);
			const costs = session.getActionCosts(action.id, params);
			const stepDef = translationBefore.actions.get(action.id);
			try {
				const traces = session.performAction(action.id, params);
				const snapshotAfter = session.getSnapshot();
				const translationAfter = buildTranslationContext(snapshotAfter);
				const playerAfter = snapshotAfter.game.players.find(
					(entry) => entry.id === activePlayerId,
				);
				if (!playerAfter) {
					throw new Error('Missing active player after action');
				}
				const after = snapshotPlayer(playerAfter);
				const diffContext = createTranslationDiffContext(
					translationAfter,
					playerAfter.id,
					after,
					snapshotAfter.game.players.map((playerState) => ({
						id: playerState.id,
						passives: snapshotPlayer(playerState).passives,
					})),
				);
				const resolvedStep = resolveActionEffects(stepDef, params);
				const { logLines, filtered, logHeadline } = buildActionLogResult({
					action,
					params,
					translation: translationAfter,
					diffContext,
					before,
					after,
					costs,
					resourceKeys,
					step: resolvedStep,
					traces,
				});
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
				let icon = '';
				try {
					icon = translationBefore.actions.get(action.id)?.icon || '';
				} catch {
					icon = '';
				}
				const message = (error as Error).message || 'Action failed';
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
