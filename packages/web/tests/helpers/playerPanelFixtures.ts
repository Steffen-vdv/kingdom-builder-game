import { vi } from 'vitest';
import type { EngineSessionSnapshot, PlayerId } from '@kingdom-builder/engine';
import { createTranslationContext } from '../../src/translation/context';
import { createTranslationAssets } from '../../src/translation/context/assets';
import type { GameEngineContextValue } from '../../src/state/GameContext.types';
import { createSessionSnapshot, createSnapshotPlayer } from './sessionFixtures';
import { selectSessionView } from '../../src/state/sessionSelectors';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTestRegistryMetadata } from './registryMetadata';
import { createTestSessionScaffold } from './testSessionScaffold';

export interface PlayerPanelFixtures {
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: GameEngineContextValue;
	resourceForecast: Record<string, number>;
	displayableStatKeys: string[];
	statForecast: Record<string, number>;
	registries: SessionRegistries;
	metadata: EngineSessionSnapshot['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
}

export function createPlayerPanelFixtures(): PlayerPanelFixtures {
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const {
		registries: sessionRegistries,
		metadata: sessionMetadata,
		phases,
		ruleSnapshot,
	} = createTestSessionScaffold();
	const translationAssets = createTranslationAssets(
		sessionRegistries,
		sessionMetadata,
		{ rules: ruleSnapshot },
	);
	const resourceKeys = Object.keys(sessionRegistries.resources);
	const resourceValues = resourceKeys.reduce<Record<string, number>>(
		(acc, key, index) => {
			acc[key] = index + 2;
			return acc;
		},
		{},
	);
	const stats: Record<string, number> = {};
	const statsHistory: Record<string, boolean> = {};
	let statIndex = 0;
	const statEntries = Object.entries(translationAssets.stats);
	const maxPopulationKey =
		statEntries.find(([, entry]) =>
			entry.label?.toLowerCase().includes('max population'),
		)?.[0] ?? 'maxPopulation';
	for (const [statKey] of statEntries) {
		if (statKey === maxPopulationKey) {
			continue;
		}
		const value = statIndex % 2 === 0 ? statIndex + 1 : 0;
		stats[statKey] = value;
		if (value === 0) {
			statsHistory[statKey] = true;
		}
		statIndex += 1;
	}
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
		phases,
		actionCostResource: ruleSnapshot.tieredResourceKey,
		ruleSnapshot,
		metadata: sessionMetadata,
	});
	const translationContext = createTranslationContext(
		sessionState,
		sessionRegistries,
		sessionState.metadata,
		{
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		sessionRegistries,
		sessionState.metadata,
	);
	const sessionView = selectSessionView(sessionState, sessionRegistries);
	const mockGame: GameEngineContextValue = {
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
		phase: {
			currentPhaseId: sessionState.game.currentPhase,
			isActionPhase: Boolean(
				sessionState.phases[sessionState.game.phaseIndex]?.action,
			),
			canEndTurn: true,
			isAdvancing: false,
		},
		actionCostResource: sessionState.actionCostResource,
		requests: {
			performAction: vi.fn().mockResolvedValue(undefined),
			advancePhase: vi.fn().mockResolvedValue(undefined),
			refreshSession: vi.fn().mockResolvedValue(undefined),
			hasAiController: vi.fn().mockReturnValue(false),
			readActionMetadata: vi.fn().mockReturnValue({}),
			subscribeActionMetadata: vi.fn().mockReturnValue(() => {}),
			getActionCosts: vi.fn().mockReturnValue({}),
			getActionRequirements: vi.fn().mockReturnValue([]),
			simulateUpcomingPhases: vi.fn(),
			enqueueTask: vi.fn().mockResolvedValue(undefined),
		},
		metadata: {
			getRuleSnapshot: () => ruleSnapshot,
			getSessionView: () => sessionView,
			getTranslationContext: () => translationContext,
		},
		runUntilActionPhase: vi.fn(),
		refreshPhaseState: vi.fn(),
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
	};
	const resourceForecast = resourceKeys.reduce<Record<string, number>>(
		(acc, key, index) => {
			const offset = index + 1;
			acc[key] = index % 2 === 0 ? offset : -offset;
			return acc;
		},
		{},
	);
	const displayableStatKeys = Object.entries(activePlayer.stats)
		.filter(([statKey, statValue]) => {
			if (statKey === maxPopulationKey) {
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
		registries: sessionRegistries,
		metadata: sessionState.metadata,
		metadataSelectors,
	};
}
