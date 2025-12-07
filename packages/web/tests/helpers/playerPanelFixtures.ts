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
	/** Forecast deltas for all resources, keyed by V2 ID */
	forecast: Record<string, number>;
	registries: SessionRegistries;
	metadata: SessionSnapshot['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
}

type ResourceCatalog = ReturnType<
	typeof createTestSessionScaffold
>['resourceCatalogV2'];
type CategoryEntry = { type: string; id: string };

/**
 * Resolves all V2 resource IDs belonging to a category by expanding groups.
 */
function resolveResourceIdsForCategory(
	catalog: ResourceCatalog,
	category: { contents?: unknown },
): string[] {
	if (!category || !('contents' in category)) {
		return [];
	}
	const resourceIds: string[] = [];
	for (const entry of category.contents as CategoryEntry[]) {
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

/**
 * Finds the primary category by checking the isPrimary property.
 */
function findPrimaryCategory(catalog: ResourceCatalog) {
	return catalog.categories.ordered.find(
		(cat) => 'isPrimary' in cat && cat.isPrimary === true,
	);
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
	// Get all resources from the catalog - no need to separate by category
	const allResources = resourceCatalogV2.resources.ordered;
	// Find primary category to determine which resources need touched tracking
	const primaryCategory = findPrimaryCategory(resourceCatalogV2);
	const primaryResourceIds = new Set(
		primaryCategory
			? resolveResourceIdsForCategory(resourceCatalogV2, primaryCategory)
			: [],
	);
	// Build valuesV2 and resourceTouchedV2 uniformly for all resources
	const valuesV2: Record<string, number> = {};
	const resourceTouchedV2: Record<string, boolean> = {};
	for (const [index, resource] of allResources.entries()) {
		// Assign values: alternating pattern for variety in tests
		valuesV2[resource.id] = index % 2 === 0 ? index + 2 : index + 1;
		// Non-primary resources need touched flag for visibility
		if (!primaryResourceIds.has(resource.id)) {
			resourceTouchedV2[resource.id] = true;
		}
	}
	// Legacy resources object is empty - V2 is the source of truth
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: {},
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
	// Build forecast uniformly for all resources
	const forecast: Record<string, number> = {};
	for (const [index, resource] of allResources.entries()) {
		// Alternating positive/negative deltas for test variety
		const offset = index + 1;
		forecast[resource.id] = index % 2 === 0 ? offset : -offset;
	}
	return {
		activePlayer,
		mockGame,
		forecast,
		registries: sessionRegistries,
		metadata: sessionState.metadata,
		metadataSelectors,
	};
}
