import { vi } from 'vitest';
import type {
	EngineSession,
	EngineSessionSnapshot,
	PlayerId,
} from '@kingdom-builder/engine';
import type { SessionStatSourceContribution } from '@kingdom-builder/protocol';
import { createTranslationContext } from '../../src/translation/context';
import { createTranslationAssets } from '../../src/translation/context/assets';
import type { LegacyGameEngineContextValue } from '../../src/state/GameContext.types';
import { createSessionSnapshot, createSnapshotPlayer } from './sessionFixtures';
import { selectSessionView } from '../../src/state/sessionSelectors';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTestRegistryMetadata } from './registryMetadata';
import { createTestSessionScaffold } from './testSessionScaffold';

export interface PlayerPanelFixtures {
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: LegacyGameEngineContextValue;
	resourceForecast: Record<string, number>;
	displayableStatKeys: string[];
	statForecast: Record<string, number>;
	registries: SessionRegistries;
	metadata: EngineSessionSnapshot['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	percentStatKey?: string;
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
	const statEntries = Object.entries(translationAssets.stats);
	const maxPopulationKey =
		statEntries.find(([, entry]) =>
			entry.label?.toLowerCase().includes('max population'),
		)?.[0] ?? 'maxPopulation';
	const percentStatKeys = new Set<string>();
	let primaryPercentStatKey: string | undefined;
	let percentIndex = 0;
	let nonPercentIndex = 0;
	const statSources: Record<
		string,
		Record<string, SessionStatSourceContribution>
	> = {};
	const isPercentStat = (key: string) => {
		const entry = translationAssets.stats[key];
		if (!entry) {
			return false;
		}
		if (typeof entry.displayAsPercent === 'boolean') {
			return entry.displayAsPercent;
		}
		return Boolean(entry.format?.percent);
	};
	for (const [statKey] of statEntries) {
		if (statKey === maxPopulationKey) {
			continue;
		}
		if (isPercentStat(statKey)) {
			const value = 0.25 + percentIndex * 0.1;
			stats[statKey] = value;
			percentStatKeys.add(statKey);
			if (!primaryPercentStatKey) {
				primaryPercentStatKey = statKey;
			}
			statSources[statKey] = {
				[`${statKey}-source`]: {
					amount: value,
					meta: {
						key: statKey,
						longevity: 'ongoing',
						kind: 'passive',
						id: `${statKey}.passive`,
					},
				},
			};
			percentIndex += 1;
			continue;
		}
		const value = nonPercentIndex % 2 === 0 ? nonPercentIndex + 1 : 0;
		stats[statKey] = value;
		if (value === 0) {
			statsHistory[statKey] = true;
		}
		nonPercentIndex += 1;
	}
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: resourceValues,
		stats,
		statsHistory,
		statSources,
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
			if (percentStatKeys.has(key)) {
				acc[key] = 0.1;
				return acc;
			}
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
		percentStatKey: primaryPercentStatKey,
	};
}
