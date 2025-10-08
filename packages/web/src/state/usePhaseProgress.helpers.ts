import {
	type EngineAdvanceResult,
	type EngineSession,
	type EngineSessionSnapshot,
	type PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	type ResourceKey,
	type StepDef,
} from '@kingdom-builder/contents';
import {
	createTranslationContext,
	createTranslationDiffContext,
	diffStepSnapshots,
	snapshotPlayer,
} from '../translation';
import type { PhaseStep } from './phaseTypes';
import { describeSkipEvent } from '../utils/describeSkipEvent';

const TRANSLATION_REGISTRIES = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
} as const;

interface AdvanceToActionPhaseOptions {
	session: EngineSession;
	actionCostResource: ResourceKey;
	resourceKeys: ResourceKey[];
	runDelay: (total: number) => Promise<void>;
	runStepDelay: () => Promise<void>;
	mountedRef: React.MutableRefObject<boolean>;
	setPhaseSteps: React.Dispatch<React.SetStateAction<PhaseStep[]>>;
	setPhaseHistories: React.Dispatch<
		React.SetStateAction<Record<string, PhaseStep[]>>
	>;
	setPhaseTimer: (value: number) => void;
	setDisplayPhase: (phase: string) => void;
	setTabsEnabled: (value: boolean) => void;
	setMainApStart: (value: number) => void;
	updateMainPhaseStep: (value: number) => void;
	addLog: (entry: string | string[], player?: PlayerStateSnapshot) => void;
	refresh: () => void;
}

export async function advanceToActionPhase({
	session,
	actionCostResource,
	resourceKeys,
	runDelay,
	runStepDelay,
	mountedRef,
	setPhaseSteps,
	setPhaseHistories,
	setPhaseTimer,
	setDisplayPhase,
	setTabsEnabled,
	setMainApStart,
	updateMainPhaseStep,
	addLog,
	refresh,
}: AdvanceToActionPhaseOptions) {
	let snapshot = session.getSnapshot();
	const buildTranslationContext = (state: EngineSessionSnapshot) =>
		createTranslationContext(state, TRANSLATION_REGISTRIES, {
			pullEffectLog: <T>(key: string) => session.pullEffectLog<T>(key),
			evaluationMods: session.getPassiveEvaluationMods(),
		});
	let translation = buildTranslationContext(snapshot);
	if (snapshot.phases[snapshot.game.phaseIndex]?.action) {
		if (!mountedRef.current) {
			return;
		}
		setPhaseTimer(0);
		setTabsEnabled(true);
		setDisplayPhase(snapshot.game.currentPhase);
		return;
	}
	setTabsEnabled(false);
	setPhaseSteps([]);
	setDisplayPhase(snapshot.game.currentPhase);
	setPhaseHistories({});
	let ranSteps = false;
	let lastPhase: string | null = null;
	while (!snapshot.phases[snapshot.game.phaseIndex]?.action) {
		ranSteps = true;
		const activePlayerBefore = snapshot.game.players.find(
			(player) => player.id === snapshot.game.activePlayerId,
		);
		if (!activePlayerBefore) {
			break;
		}
		const before = snapshotPlayer(activePlayerBefore);
		const { phase, step, player, effects, skipped }: EngineAdvanceResult =
			session.advancePhase();
		const phaseDef = snapshot.phases.find(
			(phaseDefinition) => phaseDefinition.id === phase,
		);
		if (!phaseDef) {
			break;
		}
		const stepDef = phaseDef.steps.find(
			(stepDefinition) => stepDefinition.id === step,
		);
		const updatedSnapshot = session.getSnapshot();
		translation = buildTranslationContext(updatedSnapshot);
		const diffPlayers = updatedSnapshot.game.players.map((playerState) => ({
			id: playerState.id,
			passives: snapshotPlayer(playerState).passives,
		}));
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
			const after = snapshotPlayer(player);
			const stepWithEffects: StepDef | undefined = stepDef
				? ({ ...(stepDef as StepDef), effects } as StepDef)
				: undefined;
			const diffContext = createTranslationDiffContext(
				translation,
				player.id,
				after,
				diffPlayers,
			);
			const changes = diffStepSnapshots(
				before,
				after,
				stepWithEffects,
				diffContext,
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
		snapshot = updatedSnapshot;
	}
	if (ranSteps) {
		await runDelay(1500);
		if (!mountedRef.current) {
			return;
		}
	} else if (!mountedRef.current) {
		return;
	} else {
		setPhaseTimer(0);
	}
	const refreshed = session.getSnapshot();
	const activeAtAction = refreshed.game.players.find(
		(player) => player.id === refreshed.game.activePlayerId,
	);
	const start = activeAtAction?.resources[actionCostResource] ?? 0;
	if (!mountedRef.current) {
		return;
	}
	setMainApStart(start);
	updateMainPhaseStep(start);
	setDisplayPhase(refreshed.game.currentPhase);
	setTabsEnabled(true);
	refresh();
}
