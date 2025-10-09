import { type ResourceKey } from '@kingdom-builder/contents';
import type {
	SessionAdvanceResponse,
	SessionAdvanceResult,
	SessionPhaseDefinition,
	SessionPhaseStepDefinition,
} from '@kingdom-builder/protocol/session';
import { snapshotPlayer } from '../translation';
import type { PhaseStep } from './phaseTypes';
import { getLegacySessionContext } from './getLegacySessionContext';
import { advanceSessionPhase } from './sessionSdk';
import type { LegacySession } from './sessionTypes';
import type {
	FormatPhaseResolutionOptions,
	PhaseResolutionFormatResult,
} from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';
import type { EngineAdvanceResult } from '@kingdom-builder/engine';

type FormatPhaseResolution = (
	options: FormatPhaseResolutionOptions,
) => PhaseResolutionFormatResult;

interface PhaseStepEntryConfig {
	title: string;
	summaries: string[];
	italic: boolean;
	active: boolean;
	done: boolean;
}

function createPhaseStepEntry({
	title,
	summaries,
	italic,
	active,
	done,
}: PhaseStepEntryConfig): PhaseStep {
	return {
		title,
		active,
		items: summaries.map((summary) => ({
			text: summary,
			...(italic ? { italic: true } : {}),
			...(done ? { done: true } : {}),
		})),
	};
}

function activatePhaseSteps(
	previous: PhaseStep[],
	title: string,
	summaries: string[],
	italic: boolean,
): PhaseStep[] {
	const nextEntry = createPhaseStepEntry({
		title,
		summaries,
		italic,
		active: true,
		done: false,
	});
	return [...previous.map((entry) => ({ ...entry, active: false })), nextEntry];
}

function completeLatestPhaseStep(
	previous: PhaseStep[],
	title: string,
	summaries: string[],
	italic: boolean,
): PhaseStep[] {
	if (!previous.length) {
		return previous;
	}
	const next = [...previous];
	next[next.length - 1] = createPhaseStepEntry({
		title,
		summaries,
		italic,
		active: false,
		done: !italic,
	});
	return next;
}

function resolveHistoryTitle(
	formatted: PhaseResolutionFormatResult,
	phaseDefinition: SessionPhaseDefinition | undefined,
	stepDefinition: SessionPhaseStepDefinition | undefined,
	phaseId: string,
): string {
	const trimmedStep = stepDefinition?.title?.trim();
	if (trimmedStep) {
		return trimmedStep;
	}
	if (
		typeof formatted.source !== 'string' &&
		formatted.source.kind === 'phase'
	) {
		const candidate =
			formatted.source.name?.trim() ?? formatted.source.label?.trim();
		if (candidate) {
			return candidate;
		}
	}
	const fallbackPhase = phaseDefinition?.label?.trim();
	if (fallbackPhase) {
		return `${fallbackPhase} Phase`;
	}
	return `${phaseId} Phase`;
}

interface AdvanceToActionPhaseOptions {
	session: LegacySession;
	sessionId: string;
	actionCostResource: ResourceKey;
	resourceKeys: ResourceKey[];
	mountedRef: React.MutableRefObject<boolean>;
	setPhaseSteps: React.Dispatch<React.SetStateAction<PhaseStep[]>>;
	setPhaseHistories: React.Dispatch<
		React.SetStateAction<Record<string, PhaseStep[]>>
	>;
	setDisplayPhase: (phase: string) => void;
	setTabsEnabled: (value: boolean) => void;
	setMainApStart: (value: number) => void;
	updateMainPhaseStep: (value: number) => void;
	refresh: () => void;
	formatPhaseResolution: FormatPhaseResolution;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
}

export async function advanceToActionPhase({
	session,
	sessionId,
	actionCostResource,
	resourceKeys,
	mountedRef,
	setPhaseSteps,
	setPhaseHistories,
	setDisplayPhase,
	setTabsEnabled,
	setMainApStart,
	updateMainPhaseStep,
	refresh,
	formatPhaseResolution,
	showResolution,
}: AdvanceToActionPhaseOptions) {
	let snapshot = session.getSnapshot();
	if (snapshot.game.conclusion) {
		setTabsEnabled(false);
		setPhaseSteps([]);
		setPhaseHistories({});
		setDisplayPhase(snapshot.game.currentPhase);
		refresh();
		return;
	}
	if (snapshot.phases[snapshot.game.phaseIndex]?.action) {
		if (!mountedRef.current) {
			return;
		}
		setTabsEnabled(true);
		setDisplayPhase(snapshot.game.currentPhase);
		return;
	}
	setTabsEnabled(false);
	setPhaseSteps([]);
	setDisplayPhase(snapshot.game.currentPhase);
	setPhaseHistories({});
	let lastPhase: string | null = null;
	while (!snapshot.phases[snapshot.game.phaseIndex]?.action) {
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
			setTabsEnabled(false);
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
			if (!mountedRef.current) {
				return;
			}
			setPhaseSteps([]);
			setDisplayPhase(phase);
			lastPhase = phase;
		}
		const { diffContext } = getLegacySessionContext({
			snapshot: snapshotAfter,
			ruleSnapshot: snapshotAfter.rules,
			passiveRecords: snapshotAfter.passiveRecords,
		});
		const formatted = formatPhaseResolution({
			advance: {
				phase,
				step,
				effects,
				player,
				...(skipped ? { skipped } : {}),
			} as EngineAdvanceResult,
			before,
			after: snapshotPlayer(player),
			...(phaseDef ? { phaseDefinition: phaseDef } : {}),
			...(stepDef ? { stepDefinition: stepDef } : {}),
			diffContext,
			resourceKeys,
		});
		const resolutionOptions: ShowResolutionOptions = {
			lines: formatted.lines,
			summaries: formatted.summaries,
			source: formatted.source,
			player,
			...(formatted.actorLabel ? { actorLabel: formatted.actorLabel } : {}),
		};
		const historyTitle = resolveHistoryTitle(
			formatted,
			phaseDef,
			stepDef,
			phase,
		);
		const summaries = formatted.summaries.length
			? formatted.summaries
			: ['No effect'];
		const italic = Boolean(skipped);
		setPhaseSteps((previous) =>
			activatePhaseSteps(previous, historyTitle, summaries, italic),
		);
		setPhaseHistories((previous) => {
			const phaseHistory = previous[phase] ?? [];
			return {
				...previous,
				[phase]: activatePhaseSteps(
					phaseHistory,
					historyTitle,
					summaries,
					italic,
				),
			};
		});
		await showResolution(resolutionOptions);
		if (!mountedRef.current) {
			return;
		}
		setPhaseSteps((previous) =>
			completeLatestPhaseStep(previous, historyTitle, summaries, italic),
		);
		setPhaseHistories((previous) => {
			const phaseHistory = previous[phase];
			if (!phaseHistory) {
				return previous;
			}
			return {
				...previous,
				[phase]: completeLatestPhaseStep(
					phaseHistory,
					historyTitle,
					summaries,
					italic,
				),
			};
		});
		snapshot = snapshotAfter;
	}
	if (!mountedRef.current) {
		return;
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
