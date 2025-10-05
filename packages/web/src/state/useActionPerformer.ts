import { useCallback, useEffect, useRef } from 'react';
import {
	resolveActionEffects,
	type ActionParams,
	type EngineSession,
	type PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import {
	ActionId,
	RESOURCES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { diffStepSnapshots, logContent, snapshotPlayer } from '../translation';
import type { Action } from './actionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import {
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';

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
			const context = session.getLegacyContext();
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
				const stepDef = context.actions.get(action.id);
				const resolvedStep = resolveActionEffects(stepDef, params);
				const changes = diffStepSnapshots(
					before,
					after,
					resolvedStep,
					context,
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

				const normalize = (line: string) => {
					const trimmed = line.trim();
					if (!trimmed) {
						return '';
					}
					return (trimmed.split(' (')[0] ?? '')
						.replace(/\s[+-]?\d+$/, '')
						.trim();
				};

				const subLines: string[] = [];
				for (const trace of traces) {
					const subStep = context.actions.get(trace.id);
					const subResolved = resolveActionEffects(subStep);
					const subChanges = diffStepSnapshots(
						snapshotPlayer(trace.before),
						snapshotPlayer(trace.after),
						subResolved,
						context,
						resourceKeys,
					);
					if (!subChanges.length) {
						continue;
					}
					subLines.push(...subChanges);
					const icon = context.actions.get(trace.id)?.icon || '';
					const name = context.actions.get(trace.id).name;
					const line = `  ${icon} ${name}`;
					const index = messages.indexOf(line);
					if (index !== -1) {
						messages.splice(index + 1, 0, ...subChanges.map((c) => `    ${c}`));
					}
				}

				const subPrefixes = subLines.map(normalize);
				const messagePrefixes = new Set<string>();
				for (const line of messages) {
					const normalized = normalize(line);
					if (normalized) {
						messagePrefixes.add(normalized);
					}
				}

				const costLabels = new Set(
					Object.keys(costs) as (keyof typeof RESOURCES)[],
				);
				const filtered = changes.filter((line) => {
					const normalizedLine = normalize(line);
					if (messagePrefixes.has(normalizedLine)) {
						return false;
					}
					if (subPrefixes.includes(normalizedLine)) {
						return false;
					}
					for (const key of costLabels) {
						const info = RESOURCES[key];
						const prefix = info?.icon
							? `${info.icon} ${info.label}`
							: info.label;
						if (line.startsWith(prefix)) {
							return false;
						}
					}
					return true;
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
				const icon = context.actions.get(action.id)?.icon || '';
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
