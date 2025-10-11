import type {
	SessionAdvanceResponse,
	SessionAdvanceResult,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { snapshotPlayer } from '../translation';
import { getLegacySessionContext } from './getLegacySessionContext';
import { advanceSessionPhase } from './sessionSdk';
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import type { PhaseProgressState, PhaseStep } from './phaseTypes';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type {
	FormatPhaseResolutionOptions,
	PhaseResolutionFormatResult,
} from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';
import type { EngineAdvanceResult } from '@kingdom-builder/engine';

type FormatPhaseResolution = (
	options: FormatPhaseResolutionOptions,
) => PhaseResolutionFormatResult;

type PhaseHistorySetter = Dispatch<SetStateAction<Record<string, PhaseStep[]>>>;

interface AdvanceToActionPhaseOptions {
	session: LegacySession;
	sessionId: string;
	actionCostResource: SessionResourceKey;
	resourceKeys: SessionResourceKey[];
	runDelay: (total: number) => Promise<void>;
	runStepDelay: () => Promise<void>;
	mountedRef: MutableRefObject<boolean>;
	applyPhaseSnapshot: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	setPhaseSteps: Dispatch<SetStateAction<PhaseStep[]>>;
	setPhaseHistories: PhaseHistorySetter;
	setPhaseTimer: (value: number) => void;
	setDisplayPhase: (phase: string) => void;
	setTabsEnabled: (value: boolean) => void;
	setMainApStart: (value: number) => void;
	updateMainPhaseStep: (value: number) => void;
	addLog: (
		entry: string | string[],
		player?: SessionPlayerStateSnapshot,
	) => void;
	refresh: () => void;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
	formatPhaseResolution: FormatPhaseResolution;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
}

function createPhaseHeader(
	phaseId: string,
	phaseDef: { icon?: string | null; label?: string | null } | undefined,
): string {
	const icon = phaseDef?.icon?.trim();
	const label = phaseDef?.label?.trim() ?? phaseId;
	const parts = [icon, label].filter((part): part is string => Boolean(part));
	if (!parts.length) {
		return 'Phase';
	}
	return `${parts.join(' ')} Phase`;
}

function createStepTitle(
	formatted: PhaseResolutionFormatResult,
	step: string,
	stepTitle?: string | null,
): string {
	const detailSource =
		typeof formatted.source === 'string' ? null : formatted.source;
	const resolved = detailSource?.name?.trim();
	if (resolved) {
		return resolved;
	}
	const sourceLabel = detailSource?.label?.trim();
	if (sourceLabel) {
		return sourceLabel;
	}
	const trimmedStepTitle = stepTitle?.trim();
	if (trimmedStepTitle) {
		return trimmedStepTitle;
	}
	return step;
}

function buildSummaryItems(summaries: string[]): PhaseStep['items'] {
	if (!summaries.length) {
		return [{ text: 'No effect', italic: true }];
	}
	return summaries.map((entry) => {
		const trimmed = entry.trim();
		return {
			text: entry,
			...(trimmed.toLowerCase() === 'no effect' ? { italic: true } : {}),
		};
	});
}

export async function advanceToActionPhase({
	session,
	sessionId,
	actionCostResource,
	resourceKeys,
	runDelay,
	runStepDelay,
	mountedRef,
	applyPhaseSnapshot,
	setPhaseSteps,
	setPhaseHistories,
	setPhaseTimer,
	setDisplayPhase,
	setTabsEnabled,
	setMainApStart,
	updateMainPhaseStep,
	addLog,
	refresh,
	registries,
	formatPhaseResolution,
	showResolution,
}: AdvanceToActionPhaseOptions) {
	let snapshot = session.getSnapshot();
	if (snapshot.game.conclusion) {
		applyPhaseSnapshot(snapshot, { isAdvancing: false });
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
		applyPhaseSnapshot(snapshot, { isAdvancing: false });
		const activeAtAction = snapshot.game.players.find(
			(player) => player.id === snapshot.game.activePlayerId,
		);
		const start = activeAtAction?.resources[actionCostResource] ?? 0;
		setPhaseTimer(0);
		setTabsEnabled(true);
		setMainApStart(start);
		updateMainPhaseStep(start);
		setDisplayPhase(snapshot.game.currentPhase);
		return;
	}
	applyPhaseSnapshot(snapshot, { isAdvancing: true, canEndTurn: false });
	setTabsEnabled(false);
	setPhaseSteps([]);
	setPhaseHistories({});
	setDisplayPhase(snapshot.game.currentPhase);
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
		const { phase, step, player, effects, skipped }: SessionAdvanceResult =
			advance;
		const snapshotAfter = advanceResponse.snapshot;
		if (snapshotAfter.game.conclusion) {
			applyPhaseSnapshot(snapshotAfter, { isAdvancing: false });
			setTabsEnabled(false);
			setPhaseTimer(0);
			setDisplayPhase(snapshotAfter.game.currentPhase);
			refresh();
			return;
		}
		const phaseDef = snapshotAfter.phases.find(
			(phaseDefinition) => phaseDefinition.id === phase,
		);
		const stepDef = phaseDef?.steps.find(
			(stepDefinition) => stepDefinition.id === step,
		);
		if (phase !== lastPhase) {
			await runDelay(1500);
			if (!mountedRef.current) {
				return;
			}
			setPhaseSteps([]);
			setDisplayPhase(phase);
			addLog(createPhaseHeader(phase, phaseDef), player);
			lastPhase = phase;
		}
		const legacyContext = getLegacySessionContext({
			snapshot: snapshotAfter,
			ruleSnapshot: snapshotAfter.rules,
			passiveRecords: snapshotAfter.passiveRecords,
			registries,
		});
		const advanceResult: EngineAdvanceResult = {
			phase,
			step,
			effects,
			player,
			...(skipped ? { skipped } : {}),
		};
		const formatOptions: FormatPhaseResolutionOptions = {
			advance: advanceResult,
			before,
			diffContext: legacyContext.diffContext,
			after: snapshotPlayer(player),
			...(phaseDef ? { phaseDefinition: phaseDef } : {}),
			...(stepDef ? { stepDefinition: stepDef } : {}),
			...(resourceKeys.length ? { resourceKeys } : {}),
		};
		const formatted = formatPhaseResolution(formatOptions);
		try {
			await showResolution({
				lines: formatted.lines,
				summaries: formatted.summaries,
				source: formatted.source,
				player,
				...(formatted.actorLabel ? { actorLabel: formatted.actorLabel } : {}),
			});
		} catch (_error) {
			addLog(formatted.lines, player);
		}
		if (!mountedRef.current) {
			return;
		}
		const title = createStepTitle(formatted, step, stepDef?.title ?? null);
		const entry: PhaseStep = {
			title,
			items: buildSummaryItems(formatted.summaries),
			active: true,
		};
		setPhaseSteps((prev) => [...prev, entry]);
		setPhaseHistories((prev) => ({
			...prev,
			[phase]: [...(prev[phase] ?? []), entry],
		}));
		await runStepDelay();
		if (!mountedRef.current) {
			return;
		}
		const finalized: PhaseStep = { ...entry, active: false };
		setPhaseSteps((prev) => {
			if (!prev.length) {
				return prev;
			}
			const next = [...prev];
			next[next.length - 1] = finalized;
			return next;
		});
		setPhaseHistories((prev) => {
			const history = prev[phase];
			if (!history?.length) {
				return prev;
			}
			const nextHistory = [...history];
			nextHistory[nextHistory.length - 1] = finalized;
			return { ...prev, [phase]: nextHistory };
		});
		applyPhaseSnapshot(snapshotAfter, { isAdvancing: true, canEndTurn: false });
		snapshot = snapshotAfter;
	}
	if (ranSteps) {
		await runDelay(1500);
		if (!mountedRef.current) {
			return;
		}
	} else {
		setPhaseTimer(0);
		if (!mountedRef.current) {
			return;
		}
	}
	const refreshed = session.getSnapshot();
	if (!mountedRef.current) {
		return;
	}
	applyPhaseSnapshot(refreshed, { isAdvancing: false });
	const activeAtAction = refreshed.game.players.find(
		(player) => player.id === refreshed.game.activePlayerId,
	);
	const start = activeAtAction?.resources[actionCostResource] ?? 0;
	setMainApStart(start);
	updateMainPhaseStep(start);
	setDisplayPhase(refreshed.game.currentPhase);
	setTabsEnabled(true);
	setPhaseTimer(0);
	refresh();
}
