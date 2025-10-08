import { vi } from 'vitest';
import type {
	EngineSession,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	RULES,
	STATS,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../../src/translation/context';
import type { GameEngineContextValue } from '../../src/state/GameContext.types';
import { selectSessionView } from '../../src/state/sessionSelectors';
import type { SessionRegistries } from '../../src/state/sessionSelectors.types';
import { createSessionSnapshot, createSnapshotPlayer } from './sessionFixtures';

export interface PlayerPanelFixtures {
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: GameEngineContextValue;
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
	const registries: SessionRegistries = {
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
	};
	const sessionView = selectSessionView(sessionState, registries);
	const translationContext = createTranslationContext(
		sessionState,
		{
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
		},
		undefined,
		{
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		},
	);
	const mockGame: GameEngineContextValue = {
		session: {} as EngineSession,
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot,
		log: [],
		logOverflowed: false,
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
		handlePerform: vi.fn().mockResolvedValue(undefined),
		runUntilActionPhase: vi.fn(),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
		updateMainPhaseStep: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
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
