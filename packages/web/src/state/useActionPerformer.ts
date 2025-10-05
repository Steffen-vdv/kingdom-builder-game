import { useCallback, useEffect, useRef } from 'react';
import {
	getActionCosts,
	performAction,
	resolveActionEffects,
	simulateAction,
	type ActionParams,
	type EngineContext,
} from '@kingdom-builder/engine';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import { diffStepSnapshots, logContent, snapshotPlayer } from '../translation';
import type { Action } from './actionTypes';

interface UseActionPerformerOptions {
	ctx: EngineContext;
	actionCostResource: ResourceKey;
	addLog: (
		entry: string | string[],
		player?: EngineContext['activePlayer'],
	) => void;
	logWithEffectDelay: (
		lines: string[],
		player: EngineContext['activePlayer'],
	) => Promise<void>;
	updateMainPhaseStep: (apStartOverride?: number) => void;
	refresh: () => void;
	pushErrorToast: (message: string) => void;
	mountedRef: React.MutableRefObject<boolean>;
	endTurn: () => Promise<void>;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
	resourceKeys: ResourceKey[];
}

export function useActionPerformer({
	ctx,
	actionCostResource,
	addLog,
	logWithEffectDelay,
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
			const player = ctx.activePlayer;
			const before = snapshotPlayer(player, ctx);
			const costs = getActionCosts(action.id, ctx, params);
			try {
				simulateAction(action.id, ctx, params);
				const traces = performAction(action.id, ctx, params);

				const after = snapshotPlayer(player, ctx);
				const stepDef = ctx.actions.get(action.id);
				const resolvedStep = resolveActionEffects(stepDef, params);
				const changes = diffStepSnapshots(
					before,
					after,
					resolvedStep,
					ctx,
					resourceKeys,
				);
				const messages = logContent('action', action.id, ctx, params);
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

				const normalize = (line: string) =>
					(line.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();

				const subLines: string[] = [];
				for (const trace of traces) {
					const subStep = ctx.actions.get(trace.id);
					const subResolved = resolveActionEffects(subStep);
					const subChanges = diffStepSnapshots(
						trace.before,
						trace.after,
						subResolved,
						ctx,
						resourceKeys,
					);
					if (!subChanges.length) {
						continue;
					}
					subLines.push(...subChanges);
					const icon = ctx.actions.get(trace.id)?.icon || '';
					const name = ctx.actions.get(trace.id).name;
					const line = `  ${icon} ${name}`;
					const index = messages.indexOf(line);
					if (index !== -1) {
						messages.splice(index + 1, 0, ...subChanges.map((c) => `    ${c}`));
					}
				}

				const subPrefixes = subLines.map(normalize);
				const messagePrefixes = new Set<string>();
				for (const line of messages) {
					const trimmed = line.trim();
					if (!trimmed.startsWith('You:') && !trimmed.startsWith('Opponent:')) {
						continue;
					}
					const body = trimmed.slice(trimmed.indexOf(':') + 1).trim();
					const normalized = normalize(body);
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
				const logLines = [...messages, ...filtered.map((c) => `  ${c}`)];

				updateMainPhaseStep();
				refresh();

				await logWithEffectDelay(logLines, player);

				if (!mountedRef.current) {
					return;
				}
				if (
					ctx.game.devMode &&
					(ctx.activePlayer.resources[actionCostResource] ?? 0) <= 0
				) {
					await endTurn();
				}
			} catch (error) {
				const icon = ctx.actions.get(action.id)?.icon || '';
				const message = (error as Error).message || 'Action failed';
				pushErrorToast(message);
				addLog(`Failed to play ${icon} ${action.name}: ${message}`, player);
				return;
			}
		},
		[
			addLog,
			ctx,
			endTurn,
			logWithEffectDelay,
			mountedRef,
			pushErrorToast,
			refresh,
			resourceKeys,
			updateMainPhaseStep,
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
