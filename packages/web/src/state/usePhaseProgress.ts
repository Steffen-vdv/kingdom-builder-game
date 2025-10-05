import { useCallback, useEffect, useState } from 'react';
import { advance, type EngineContext } from '@kingdom-builder/engine';
import { type ResourceKey, type StepDef } from '@kingdom-builder/contents';
import { diffStepSnapshots, snapshotPlayer } from '../translation';
import { describeSkipEvent } from '../utils/describeSkipEvent';
import type { PhaseStep } from './phaseTypes';
import { usePhaseDelays } from './usePhaseDelays';
import { useMainPhaseTracker } from './useMainPhaseTracker';

interface PhaseProgressOptions {
	ctx: EngineContext;
	actionPhaseId: string | undefined;
	actionCostResource: ResourceKey;
	addLog: (
		entry: string | string[],
		player?: EngineContext['activePlayer'],
	) => void;
	mountedRef: React.MutableRefObject<boolean>;
	timeScaleRef: React.MutableRefObject<number>;
	setTrackedInterval: (callback: () => void, delay: number) => number;
	clearTrackedInterval: (id: number) => void;
	refresh: () => void;
	resourceKeys: ResourceKey[];
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
}

export function usePhaseProgress({
	ctx,
	actionPhaseId,
	actionCostResource,
	addLog,
	mountedRef,
	timeScaleRef,
	setTrackedInterval,
	clearTrackedInterval,
	refresh,
	resourceKeys,
	enqueue,
}: PhaseProgressOptions) {
	const [phaseSteps, setPhaseSteps] = useState<PhaseStep[]>([]);
	const [phaseTimer, setPhaseTimer] = useState(0);
	const [displayPhase, setDisplayPhase] = useState(ctx.game.currentPhase);
	const [phaseHistories, setPhaseHistories] = useState<
		Record<string, PhaseStep[]>
	>({});
	const [tabsEnabled, setTabsEnabled] = useState(false);

	const { mainApStart, setMainApStart, updateMainPhaseStep } =
		useMainPhaseTracker({
			ctx,
			actionCostResource,
			actionPhaseId,
			setPhaseSteps,
			setPhaseHistories,
			setDisplayPhase,
		});

	const { runDelay, runStepDelay } = usePhaseDelays({
		mountedRef,
		timeScaleRef,
		setTrackedInterval,
		clearTrackedInterval,
		setPhaseTimer,
	});

	const runUntilActionPhaseCore = useCallback(async () => {
		if (ctx.phases[ctx.game.phaseIndex]?.action) {
			if (!mountedRef.current) {
				return;
			}
			setPhaseTimer(0);
			setTabsEnabled(true);
			setDisplayPhase(ctx.game.currentPhase);
			return;
		}
		setTabsEnabled(false);
		setPhaseSteps([]);
		setDisplayPhase(ctx.game.currentPhase);
		setPhaseHistories({});
		let ranSteps = false;
		let lastPhase: string | null = null;
		while (!ctx.phases[ctx.game.phaseIndex]?.action) {
			ranSteps = true;
			const before = snapshotPlayer(ctx.activePlayer, ctx);
			const { phase, step, player, effects, skipped } = advance(ctx);
			const phaseDef = ctx.phases.find(
				(phaseDefinition) => phaseDefinition.id === phase,
			)!;
			const stepDef = phaseDef.steps.find(
				(stepDefinition) => stepDefinition.id === step,
			);
			if (phase !== lastPhase) {
				await runDelay(1500);
				if (!mountedRef.current) {
					return;
				}
				setPhaseSteps([]);
				setDisplayPhase(phase);
				addLog(`${phaseDef.icon} ${phaseDef.label} Phase`, player);
				lastPhase = phase;
			}
			const phaseId = phase;
			let entry: PhaseStep;
			if (skipped) {
				const summary = describeSkipEvent(skipped, phaseDef, stepDef);
				addLog(summary.logLines, player);
				entry = {
					title: summary.history.title,
					items: summary.history.items,
					active: true,
				};
			} else {
				const after = snapshotPlayer(player, ctx);
				const stepWithEffects: StepDef | undefined = stepDef
					? ({ ...(stepDef as StepDef), effects } as StepDef)
					: undefined;
				const changes = diffStepSnapshots(
					before,
					after,
					stepWithEffects,
					ctx,
					resourceKeys,
				);
				if (changes.length) {
					addLog(
						changes.map((change) => `  ${change}`),
						player,
					);
				}
				entry = {
					title: stepDef?.title || step,
					items:
						changes.length > 0
							? changes.map((text) => ({ text }))
							: [{ text: 'No effect', italic: true }],
					active: true,
				};
			}
			setPhaseSteps((prev) => [...prev, entry]);
			setPhaseHistories((prev) => ({
				...prev,
				[phaseId]: [...(prev[phaseId] ?? []), entry],
			}));
			await runStepDelay();
			if (!mountedRef.current) {
				return;
			}
			const finalized = { ...entry, active: false };
			setPhaseSteps((prev) => {
				if (!prev.length) {
					return prev;
				}
				const next = [...prev];
				next[next.length - 1] = finalized;
				return next;
			});
			setPhaseHistories((prev) => {
				const history = prev[phaseId];
				if (!history?.length) {
					return prev;
				}
				const nextHistory = [...history];
				nextHistory[nextHistory.length - 1] = finalized;
				return { ...prev, [phaseId]: nextHistory };
			});
		}
		if (ranSteps) {
			await runDelay(1500);
			if (!mountedRef.current) {
				return;
			}
		} else {
			if (!mountedRef.current) {
				return;
			}
			setPhaseTimer(0);
		}
		const start = ctx.activePlayer.resources[actionCostResource] as number;
		if (!mountedRef.current) {
			return;
		}
		setMainApStart(start);
		updateMainPhaseStep(start);
		setDisplayPhase(ctx.game.currentPhase);
		setTabsEnabled(true);
		refresh();
	}, [
		actionCostResource,
		actionPhaseId,
		addLog,
		ctx,
		mountedRef,
		refresh,
		resourceKeys,
		runDelay,
		runStepDelay,
		updateMainPhaseStep,
	]);

	const runUntilActionPhase = useCallback(
		() => enqueue(runUntilActionPhaseCore),
		[enqueue, runUntilActionPhaseCore],
	);

	const endTurn = useCallback(async () => {
		const phaseDef = ctx.phases[ctx.game.phaseIndex];
		if (!phaseDef?.action) {
			return;
		}
		if ((ctx.activePlayer.resources[actionCostResource] ?? 0) > 0) {
			return;
		}
		advance(ctx);
		setPhaseHistories({});
		await runUntilActionPhaseCore();
	}, [actionCostResource, ctx, runUntilActionPhaseCore]);

	const handleEndTurn = useCallback(() => enqueue(endTurn), [enqueue, endTurn]);

	useEffect(() => {
		if (!tabsEnabled) {
			return;
		}
		if (!ctx.phases[ctx.game.phaseIndex]?.action) {
			return;
		}
		const start = ctx.activePlayer.resources[actionCostResource] as number;
		setMainApStart(start);
		updateMainPhaseStep(start);
	}, [actionCostResource, ctx, tabsEnabled, updateMainPhaseStep]);

	return {
		phaseSteps,
		setPhaseSteps,
		phaseTimer,
		mainApStart,
		displayPhase,
		setDisplayPhase,
		phaseHistories,
		tabsEnabled,
		runUntilActionPhase,
		runUntilActionPhaseCore,
		handleEndTurn,
		endTurn,
		updateMainPhaseStep,
		setPhaseHistories,
		setTabsEnabled,
	};
}
