import { vi } from 'vitest';
import type {
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { createTranslationContext } from '../../src/translation/context';
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
	/** V2 IDs for secondary resources that should be visible in tests */
	displayableSecondaryResourceIds: string[];
	secondaryForecast: Record<string, number>;
	registries: SessionRegistries;
	metadata: SessionSnapshot['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
}

/**
 * Resolves all V2 resource IDs belonging to a category by expanding groups.
 */
function resolveResourceIdsForCategory(
	catalog: ReturnType<typeof createTestSessionScaffold>['resourceCatalogV2'],
	categoryId: string,
): string[] {
	const category = catalog.categories.byId[categoryId];
	if (!category || !('contents' in category)) {
		return [];
	}
	const resourceIds: string[] = [];
	for (const entry of category.contents as Array<{
		type: string;
		id: string;
	}>) {
		if (entry.type === 'resource') {
			resourceIds.push(entry.id);
		} else if (entry.type === 'group') {
			// Find all resources belonging to this group
			for (const resource of catalog.resources.ordered) {
				if (resource.groupId === entry.id) {
					resourceIds.push(resource.id);
				}
			}
		}
	}
	return resourceIds;
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
	// Get primary and secondary resource IDs directly from V2 catalog
	const primaryResourceIds = resolveResourceIdsForCategory(
		resourceCatalogV2,
		'category:primary',
	);
	const secondaryResourceIds = resolveResourceIdsForCategory(
		resourceCatalogV2,
		'category:secondary',
	);
	// Find max-population resource to exclude from secondary display
	const maxPopulationId =
		secondaryResourceIds.find((id) => id.includes('max-population')) ??
		'resource:core:max-population';
	// Build valuesV2 directly using V2 IDs
	const valuesV2: Record<string, number> = {};
	const resourceTouchedV2: Record<string, boolean> = {};
	// Populate primary resources
	for (const [index, resourceId] of primaryResourceIds.entries()) {
		valuesV2[resourceId] = index + 2;
	}
	// Populate secondary resources
	let secondaryIndex = 0;
	for (const resourceId of secondaryResourceIds) {
		if (resourceId === maxPopulationId) {
			continue;
		}
		const value = secondaryIndex % 2 === 0 ? secondaryIndex + 1 : 0;
		valuesV2[resourceId] = value;
		// Mark all secondary resources as touched for visibility
		resourceTouchedV2[resourceId] = true;
		secondaryIndex += 1;
	}
	// Build legacy resource object from V2 values for backward compat
	const resourceKeys = Object.keys(sessionRegistries.resources);
	const resourceValues: Record<string, number> = {};
	for (const key of resourceKeys) {
		// Find matching V2 ID in primary resources
		const v2Id = primaryResourceIds.find((id) => id.includes(key));
		resourceValues[key] = v2Id ? (valuesV2[v2Id] ?? 0) : 0;
	}
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: resourceValues,
		stats: {},
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
	const displayableSecondaryResourceIds = secondaryResourceIds.filter(
		(resourceId) => {
			if (resourceId === maxPopulationId) {
				return false;
			}
			const value = valuesV2[resourceId] ?? 0;
			if (value !== 0) {
				return true;
			}
			return Boolean(resourceTouchedV2[resourceId]);
		},
	);
	const secondaryForecast = displayableSecondaryResourceIds.reduce<
		Record<string, number>
	>((acc, resourceId, index) => {
		const offset = index + 2;
		acc[resourceId] = index % 2 === 0 ? offset : -offset;
		return acc;
	}, {});
	return {
		activePlayer,
		mockGame,
		resourceForecast,
		displayableSecondaryResourceIds,
		secondaryForecast,
		registries: sessionRegistries,
		metadata: sessionState.metadata,
		metadataSelectors,
	};
}
