/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PopulationInfo from '../src/components/player/PopulationInfo';
// prettier-ignore
import {
	RegistryMetadataProvider,
} from '../src/contexts/RegistryMetadataContext';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import { toDescriptorDisplay } from '../src/components/player/registryDisplays';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createPassiveGame } from './helpers/createPassiveDisplayGame';
// prettier-ignore
import type { GameEngineContextValue } from '../src/state/GameContext.types';
import type { SessionPlayerId } from '@kingdom-builder/protocol';

interface PopulationInfoScenario {
	registries: ReturnType<typeof createTestSessionScaffold>['registries'];
	metadata: ReturnType<typeof createTestSessionScaffold>['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: GameEngineContextValue;
	forecast: Record<
		string,
		{
			resources: Record<string, number>;
			stats: Record<string, number>;
			population: Record<string, number>;
		}
	>;
	populationIds: string[];
	maxPopulationKey: string;
}

function resolveMaxPopulationKey(metadata: PopulationInfoScenario['metadata']) {
	const statEntries = Object.entries(metadata.stats ?? {});
	const keyed = statEntries.find(([, descriptor]) =>
		descriptor.label?.toLowerCase().includes('max population'),
	);
	return keyed?.[0] ?? 'maxPopulation';
}

// Build V2 ID for population role
function getPopulationRoleV2Id(legacyKey: string): string {
	return `resource:population:role:${legacyKey}`;
}

// Build V2 ID for stat
function getStatV2Id(legacyKey: string): string {
	// Convert camelCase to kebab-case for stat IDs
	const kebab = legacyKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	return `resource:stat:${kebab}`;
}

function createPopulationInfoScenario(
	options: {
		omitMetadataFor?: string;
		playerStats?: Record<string, number>;
		statsHistory?: Record<string, boolean>;
	} = {},
): PopulationInfoScenario {
	const scaffold = createTestSessionScaffold();
	const registries = scaffold.registries;
	const metadata = structuredClone(scaffold.metadata);
	if (options.omitMetadataFor && metadata.populations) {
		delete metadata.populations[options.omitMetadataFor];
	}
	const populationIds = registries.populations.keys();
	if (!populationIds.length) {
		throw new Error('Expected at least one population role in registries.');
	}
	const [primaryRole, secondaryRole] = populationIds;
	const populationCounts: Record<string, number> = {
		[primaryRole]: 3,
	};
	if (secondaryRole) {
		populationCounts[secondaryRole] = 1;
	}
	const maxPopulationKey = resolveMaxPopulationKey(metadata);
	const playerStats: Record<string, number> = {
		...(options.playerStats ?? {}),
	};
	if (!(maxPopulationKey in playerStats)) {
		playerStats[maxPopulationKey] = 5;
	}
	// Build valuesV2 from population counts and stats using V2 IDs
	const valuesV2: Record<string, number> = {};
	for (const [role, count] of Object.entries(populationCounts)) {
		valuesV2[getPopulationRoleV2Id(role)] = count;
	}
	for (const [key, value] of Object.entries(playerStats)) {
		valuesV2[getStatV2Id(key)] = value;
	}
	const activePlayer = createSnapshotPlayer({
		id: 'player-1' as SessionPlayerId,
		name: 'Player One',
		population: populationCounts,
		stats: playerStats,
		statsHistory: { ...(options.statsHistory ?? {}) },
		valuesV2,
	});
	const opponent = createSnapshotPlayer({
		id: 'player-2' as SessionPlayerId,
		name: 'Player Two',
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
		resourceCatalogV2: scaffold.resourceCatalogV2,
	});
	const { mockGame } = createPassiveGame(sessionState, {
		ruleSnapshot: scaffold.ruleSnapshot,
		registries,
		metadata,
	});
	const metadataSelectors = createTestRegistryMetadata(registries, metadata);
	const forecast: PopulationInfoScenario['forecast'] = {
		[activePlayer.id]: {
			resources: {},
			stats: {},
			population: populationCounts,
		},
	};
	return {
		registries,
		metadata,
		metadataSelectors,
		activePlayer,
		mockGame: mockGame as GameEngineContextValue,
		forecast,
		populationIds,
		maxPopulationKey,
	};
}

let scenario = createPopulationInfoScenario();
let currentGame = scenario.mockGame;
let forecastByPlayerId = scenario.forecast;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
	useOptionalGameEngine: () => currentGame,
}));

vi.mock('../src/state/useNextTurnForecast', () => ({
	useNextTurnForecast: () => forecastByPlayerId,
}));

describe('<PopulationInfo />', () => {
	beforeEach(() => {
		scenario = createPopulationInfoScenario();
		currentGame = scenario.mockGame;
		forecastByPlayerId = scenario.forecast;
	});

	it('renders population roles using registry metadata labels and icons', () => {
		const { registries, metadata, activePlayer, populationIds } = scenario;
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PopulationInfo player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const [primaryRole] = populationIds;
		// Get the V2 metadata label (used by the component)
		const v2RoleId = getPopulationRoleV2Id(primaryRole);
		const v2Metadata = metadata.resourcesV2?.[v2RoleId];
		const roleLabel = v2Metadata?.label ?? primaryRole;
		const roleIcon = v2Metadata?.icon;
		const populationCount = activePlayer.population[primaryRole];
		// Use getAllByRole since multiple renders may exist in the DOM
		const primaryButtons = screen.getAllByRole('button', {
			name: `${roleLabel}: ${populationCount}`,
		});
		expect(primaryButtons.length).toBeGreaterThan(0);
		const primaryButton = primaryButtons[0];
		expect(primaryButton).toBeInTheDocument();
		if (roleIcon) {
			expect(primaryButton.textContent).toContain(roleIcon);
		}
		const overviewButtons = screen.getAllByRole('button', {
			name: /overview/i,
		});
		expect(overviewButtons.length).toBeGreaterThan(0);
		const populationButtonGroup = overviewButtons[0].closest('.info-bar');
		expect(populationButtonGroup).not.toBeNull();
		if (populationButtonGroup) {
			const populationButtons = within(populationButtonGroup).getAllByRole(
				'button',
			);
			expect(populationButtons.length).toBeGreaterThan(1);
		}
	});

	it('falls back when registry descriptors are missing', () => {
		const fallbackRole =
			scenario.populationIds.at(1) ?? scenario.populationIds[0];
		scenario = createPopulationInfoScenario({ omitMetadataFor: fallbackRole });
		currentGame = scenario.mockGame;
		forecastByPlayerId = scenario.forecast;
		const { registries, metadata, metadataSelectors, activePlayer } = scenario;
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PopulationInfo player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const descriptor = toDescriptorDisplay(
			metadataSelectors.populationMetadata.select(fallbackRole),
		);
		// Use getAllByRole since multiple renders may exist in the DOM
		const buttons = screen.getAllByRole('button', {
			name: `${descriptor.label}: ${activePlayer.population[fallbackRole]}`,
		});
		expect(buttons.length).toBeGreaterThan(0);
		const button = buttons[0];
		expect(button).toBeInTheDocument();
		const fallbackIcon =
			descriptor.icon ?? registries.populations.get(fallbackRole)?.icon;
		if (fallbackIcon) {
			expect(button.textContent).toContain(fallbackIcon);
		}
	});

	it('renders stat buttons using metadata-driven descriptors', () => {
		scenario = createPopulationInfoScenario({
			playerStats: { armyStrength: 2 },
		});
		currentGame = scenario.mockGame;
		forecastByPlayerId = scenario.forecast;
		const { registries, metadata, metadataSelectors, activePlayer } = scenario;
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PopulationInfo player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const descriptor = toDescriptorDisplay(
			metadataSelectors.statMetadata.select('armyStrength'),
		);
		// Use getAllByRole since multiple renders may exist in the DOM
		const statButtons = screen.getAllByRole('button', {
			name: `${descriptor.label}: 2`,
		});
		expect(statButtons.length).toBeGreaterThan(0);
		const statButton = statButtons[0];
		expect(statButton).toBeInTheDocument();
		if (descriptor.icon) {
			expect(statButton.textContent).toContain(descriptor.icon);
		}
	});
});
