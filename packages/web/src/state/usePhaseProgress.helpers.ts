import {
	type EngineAdvanceResult,
	type EngineSession,
	type PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import { type ResourceKey } from '@kingdom-builder/contents';
import type { SessionAdvanceResponse } from '@kingdom-builder/protocol/session';
import { diffStepSnapshots, snapshotPlayer } from '../translation';
import { describeSkipEvent } from '../utils/describeSkipEvent';
import type { PhaseStep } from './phaseTypes';
import { getLegacySessionContext } from './getLegacySessionContext';
import { advanceSessionPhase } from './sessionSdk';

interface AdvanceToActionPhaseOptions {
	session: EngineSession;
	sessionId: string;
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
	sessionId,
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
	if (snapshot.game.conclusion) {
		setTabsEnabled(false);
		setPhaseSteps([]);
		setPhaseHistories({});
		setDisplayPhase(snapshot.game.currentPhase);
		setPhaseTimer(0);
		refresh();
		return;
	}
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
		const advanceResponse: SessionAdvanceResponse = await advanceSessionPhase({
			sessionId,
		});
		const { advance } = advanceResponse;
		const { phase, step, player, effects, skipped }: EngineAdvanceResult =
			advance;
		const snapshotAfter = advanceResponse.snapshot;
		if (snapshotAfter.game.conclusion) {
			setTabsEnabled(false);
			setPhaseTimer(0);
			setDisplayPhase(snapshotAfter.game.currentPhase);
			refresh();
			return;
		}
		const phaseDef = snapshotAfter.phases.find(
			(phaseDefinition) => phaseDefinition.id === phase,
		);
		if (!phaseDef) {
			break;
		}
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
			const after = snapshotPlayer(player);
			const stepEffects = effects.length
				? { effects }
				: stepDef?.effects?.length
					? { effects: stepDef.effects }
					: undefined;
			const { diffContext } = getLegacySessionContext({
				snapshot: snapshotAfter,
				ruleSnapshot: snapshotAfter.rules,
				passiveRecords: snapshotAfter.passiveRecords,
			});
			const changes = diffStepSnapshots(
				before,
				after,
				stepEffects,
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
		snapshot = snapshotAfter;
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
