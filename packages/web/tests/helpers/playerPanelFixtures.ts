import { vi } from 'vitest';
import type {
	EngineSession,
	EngineSessionSnapshot,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import { createTranslationContext } from '../../src/translation/context';
import { createTranslationAssets } from '../../src/translation/context/assets';
import type { LegacyGameEngineContextValue } from '../../src/state/GameContext.types';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
	createTestPhases,
	createTestRuleSnapshot,
	createTestSessionMetadata,
} from './sessionFixtures';
import { selectSessionView } from '../../src/state/sessionSelectors';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTestRegistryMetadata } from './registryMetadata';

export interface PlayerPanelFixtures {
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: LegacyGameEngineContextValue;
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
	const sessionRegistries = createSessionRegistries();
	const phases = createTestPhases();
	const resourceKeys = Object.keys(sessionRegistries.resources);
	const tieredResourceKey = resourceKeys[0] ?? 'resource:auric-light';
	const fallbackResourceKey =
		resourceKeys[resourceKeys.length - 1] ?? tieredResourceKey;
	const fallbackResource = sessionRegistries.resources[fallbackResourceKey];
	if (fallbackResource) {
		delete fallbackResource.icon;
		delete fallbackResource.description;
	}
	const ruleSnapshot: RuleSnapshot = createTestRuleSnapshot(tieredResourceKey);
	const metadata = createTestSessionMetadata(sessionRegistries, phases);
	const metadataSelectors = createTestRegistryMetadata(
		sessionRegistries,
		metadata,
	);
	const translationAssets = createTranslationAssets(
		sessionRegistries,
		metadata,
		{ rules: ruleSnapshot },
	);
	const resourceValues = metadataSelectors.resourceMetadata.list.reduce<
		Record<string, number>
	>((acc, key, index) => {
		acc[key.id] = index + 2;
		return acc;
	}, {});
	const stats: Record<string, number> = {};
	const statsHistory: Record<string, boolean> = {};
	let statIndex = 0;
	const statKeys = Object.keys(translationAssets.stats);
	const statIds = statKeys.length
		? statKeys
		: metadataSelectors.statMetadata.list.map((descriptor) => descriptor.id);
	for (const statKey of statIds) {
		if (statKey === 'maxPopulation') {
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
		metadata,
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
		session: {} as EngineSession,
		sessionState,
		sessionView,
		handlePerform: vi.fn().mockResolvedValue(undefined),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
	};
	const resourceForecast = metadataSelectors.resourceMetadata.list.reduce<
		Record<string, number>
	>((acc, key, index) => {
		const offset = index + 1;
		acc[key.id] = index % 2 === 0 ? offset : -offset;
		return acc;
	}, {});
	const displayableStatKeys = Object.entries(activePlayer.stats)
		.filter(([statKey, statValue]) => {
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
