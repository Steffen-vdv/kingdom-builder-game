import { vi } from 'vitest';
import type {
	EngineSession,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	PHASES,
	RULES,
	STATS,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../../src/translation/context';
import type { LegacyGameEngineContextValue } from '../../src/state/GameContext.types';
import { createSessionSnapshot, createSnapshotPlayer } from './sessionFixtures';
import { selectSessionView } from '../../src/state/sessionSelectors';
import { createSessionRegistries } from './sessionRegistries';

export interface PlayerPanelFixtures {
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: LegacyGameEngineContextValue;
	resourceForecast: Record<string, number>;
	displayableStatKeys: string[];
	statForecast: Record<string, number>;
}

export function createPlayerPanelFixtures(): PlayerPanelFixtures {
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const ruleSnapshot: RuleSnapshot = {
		...RULES,
		tierDefinitions: RULES.tierDefinitions.map((tier) => ({ ...tier })),
	};
	const resourceValues = Object.keys(RESOURCES).reduce<Record<string, number>>(
		(acc, key, index) => {
			acc[key] = index + 2;
			return acc;
		},
		{},
	);
	const nonCapacityStatEntries = Object.entries(STATS).filter(
		([, info]) => !info.capacity,
	);
	const stats: Record<string, number> = {};
	const statsHistory: Record<string, boolean> = {};
	nonCapacityStatEntries.forEach(([statKey], index) => {
		const value = index % 2 === 0 ? index + 1 : 0;
		stats[statKey] = value;
		if (value === 0) {
			statsHistory[statKey] = true;
		}
	});
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: resourceValues,
		stats,
		statsHistory,
		population: {},
	});
	const opponent = createSnapshotPlayer({
		id: opponentId,
		name: 'Player Two',
		resources: {},
		stats: {},
		population: {},
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId,
		opponentId,
		phases: PHASES,
		actionCostResource: RULES.tieredResourceKey as ResourceKey,
		ruleSnapshot,
	});
	const sessionRegistries = createSessionRegistries();
	const translationContext = createTranslationContext(
		sessionState,
		{
			actions: sessionRegistries.actions,
			buildings: sessionRegistries.buildings,
			developments: sessionRegistries.developments,
			populations: sessionRegistries.populations,
			resources: sessionRegistries.resources,
		},
		sessionState.metadata,
		{
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		},
	);
	const sessionView = selectSessionView(sessionState, sessionRegistries);
	const mockGame: LegacyGameEngineContextValue = {
		sessionId: 'test-session',
		sessionSnapshot: sessionState,
		cachedSessionSnapshot: sessionState,
		selectors: { sessionView },
		translationContext,
		ruleSnapshot,
		log: [],
		logOverflowed: false,
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		phaseSteps: [],
		setPhaseSteps: vi.fn(),
		phaseTimer: 0,
		mainApStart: 0,
		displayPhase: sessionState.game.currentPhase,
		setDisplayPhase: vi.fn(),
		phaseHistories: {},
		tabsEnabled: true,
		actionCostResource: sessionState.actionCostResource,
		requests: {
			performAction: vi.fn().mockResolvedValue(undefined),
			advancePhase: vi.fn().mockResolvedValue(undefined),
			refreshSession: vi.fn().mockResolvedValue(undefined),
		},
		metadata: {
			getRuleSnapshot: () => ruleSnapshot,
			getSessionView: () => sessionView,
			getTranslationContext: () => translationContext,
		},
		runUntilActionPhase: vi.fn(),
		updateMainPhaseStep: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		musicEnabled: true,
		onToggleMusic: vi.fn(),
		soundEnabled: true,
		onToggleSound: vi.fn(),
		backgroundAudioMuted: false,
		onToggleBackgroundAudioMute: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
		toasts: [],
		pushToast: vi.fn(),
		pushErrorToast: vi.fn(),
		pushSuccessToast: vi.fn(),
		dismissToast: vi.fn(),
		playerName: 'Player',
		onChangePlayerName: vi.fn(),
		session: {} as EngineSession,
		sessionState,
		sessionView,
		handlePerform: vi.fn().mockResolvedValue(undefined),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
	};
	const resourceForecast = Object.keys(RESOURCES).reduce<
		Record<string, number>
	>((acc, key, index) => {
		const offset = index + 1;
		acc[key] = index % 2 === 0 ? offset : -offset;
		return acc;
	}, {});
	const displayableStatKeys = Object.entries(activePlayer.stats)
		.filter(([statKey, statValue]) => {
			const info = STATS[statKey as keyof typeof STATS];
			if (info.capacity) {
				return false;
			}
			if (statValue !== 0) {
				return true;
			}
			return Boolean(activePlayer.statsHistory?.[statKey]);
		})
		.map(([statKey]) => statKey);
	const statForecast = displayableStatKeys.reduce<Record<string, number>>(
		(acc, key, index) => {
			const offset = index + 2;
			acc[key] = index % 2 === 0 ? offset : -offset;
			return acc;
		},
		{},
	);
	return {
		activePlayer,
		mockGame,
		resourceForecast,
		displayableStatKeys,
		statForecast,
	};
}
