import { vi } from 'vitest';
import type {
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { createTranslationContext } from '../../src/translation/context';
import { createTranslationAssets } from '../../src/translation/context/assets';
import type { GameEngineContextValue } from '../../src/state/GameContext.types';
import { createSessionSnapshot, createSnapshotPlayer } from './sessionFixtures';
import { selectSessionView } from '../../src/state/sessionSelectors';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTestRegistryMetadata } from './registryMetadata';
import { createTestSessionScaffold } from './testSessionScaffold';

// Helper to build V2 ID for core resources (legacy key to V2 ID)
function getCoreResourceV2Id(legacyKey: string): string {
	return `resource:core:${legacyKey}`;
}

// Helper to build V2 ID for secondary resources (camelCase to kebab-case)
function getSecondaryResourceV2Id(legacyKey: string): string {
	const kebab = legacyKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	return `resource:core:${kebab}`;
}

export interface PlayerPanelFixtures {
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: GameEngineContextValue;
	resourceForecast: Record<string, number>;
	/** Legacy keys for secondary resources that should be visible in tests */
	displayableSecondaryResourceKeys: string[];
	secondaryForecast: Record<string, number>;
	registries: SessionRegistries;
	metadata: SessionSnapshot['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
}

export function createPlayerPanelFixtures(): PlayerPanelFixtures {
	const activePlayerId = 'player-1' as SessionPlayerId;
	const opponentId = 'player-2' as SessionPlayerId;
	const {
		registries: sessionRegistries,
		metadata: sessionMetadata,
		phases,
		ruleSnapshot,
		resourceCatalogV2,
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
	// Secondary resources (formerly stats) - now unified under ResourceV2
	const secondaryValues: Record<string, number> = {};
	const resourceTouchedV2: Record<string, boolean> = {};
	let resourceIndex = 0;
	// Legacy translation assets still use "stats" key - reading from it here
	const secondaryEntries = Object.entries(translationAssets.stats);
	const maxPopulationKey =
		secondaryEntries.find(([, entry]) =>
			entry.label?.toLowerCase().includes('max population'),
		)?.[0] ?? 'maxPopulation';
	for (const [legacyKey] of secondaryEntries) {
		if (legacyKey === maxPopulationKey) {
			continue;
		}
		const value = resourceIndex % 2 === 0 ? resourceIndex + 1 : 0;
		secondaryValues[legacyKey] = value;
		// Mark all secondary resources as touched using V2 IDs for visibility
		// Resources with non-zero value or that have ever been non-zero appear
		const v2Id = getSecondaryResourceV2Id(legacyKey);
		resourceTouchedV2[v2Id] = true;
		resourceIndex += 1;
	}
	// Build valuesV2 from legacy resources and secondary resources using V2 IDs
	const valuesV2: Record<string, number> = {};
	for (const [key, value] of Object.entries(resourceValues)) {
		valuesV2[getCoreResourceV2Id(key)] = value;
	}
	for (const [key, value] of Object.entries(secondaryValues)) {
		valuesV2[getSecondaryResourceV2Id(key)] = value;
	}
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: resourceValues,
		stats: secondaryValues,
		resourceTouchedV2,
		population: {},
		valuesV2,
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
		resourceCatalogV2,
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
			awaitingManualStart: false,
			activePlayerId: sessionState.game.activePlayerId,
			activePlayerName:
				sessionState.game.players.find(
					(player) => player.id === sessionState.game.activePlayerId,
				)?.name ?? null,
		},
		actionCostResource: sessionState.actionCostResource,
		requests: {
			performAction: vi.fn().mockResolvedValue(undefined),
			advancePhase: vi.fn().mockResolvedValue(undefined),
			startSession: vi.fn().mockResolvedValue(undefined),
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
	};
	const resourceForecast = resourceKeys.reduce<Record<string, number>>(
		(acc, key, index) => {
			const offset = index + 1;
			acc[key] = index % 2 === 0 ? offset : -offset;
			return acc;
		},
		{},
	);
	// Determine which secondary resources should be visible based on touched
	const displayableSecondaryResourceKeys = Object.entries(activePlayer.stats)
		.filter(([legacyKey, value]) => {
			if (legacyKey === maxPopulationKey) {
				return false;
			}
			if (value !== 0) {
				return true;
			}
			// Check using V2 ID since that's what resourceTouchedV2 stores
			const v2Id = getSecondaryResourceV2Id(legacyKey);
			return Boolean(activePlayer.resourceTouchedV2?.[v2Id]);
		})
		.map(([legacyKey]) => legacyKey);
	const secondaryForecast = displayableSecondaryResourceKeys.reduce<
		Record<string, number>
	>((acc, key, index) => {
		const offset = index + 2;
		acc[key] = index % 2 === 0 ? offset : -offset;
		return acc;
	}, {});
	return {
		activePlayer,
		mockGame,
		resourceForecast,
		displayableSecondaryResourceKeys,
		secondaryForecast,
		registries: sessionRegistries,
		metadata: sessionState.metadata,
		metadataSelectors,
	};
}
