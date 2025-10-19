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
import type {
        GameEngineContextValue,
} from '../src/state/GameContext.types';
import type { PlayerId } from '@kingdom-builder/engine';

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
	const activePlayer = createSnapshotPlayer({
		id: 'player-1' as PlayerId,
		name: 'Player One',
		population: populationCounts,
		stats: playerStats,
		statsHistory: { ...(options.statsHistory ?? {}) },
	});
	const opponent = createSnapshotPlayer({
		id: 'player-2' as PlayerId,
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
		const {
			registries,
			metadata,
			metadataSelectors,
			activePlayer,
			populationIds,
		} = scenario;
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PopulationInfo player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const [primaryRole] = populationIds;
		const primaryDescriptor = toDescriptorDisplay(
			metadataSelectors.populationMetadata.select(primaryRole),
		);
		const primaryButton = screen.getByRole('button', {
			name: `${primaryDescriptor.label}: ${activePlayer.population[primaryRole]}`,
		});
		expect(primaryButton).toBeInTheDocument();
		if (primaryDescriptor.icon) {
			expect(primaryButton.textContent).toContain(primaryDescriptor.icon);
		}
		const populationButtonGroup = screen
			.getByRole('button', {
				name: /overview/i,
			})
			.closest('.info-bar');
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
		const button = screen.getByRole('button', {
			name: `${descriptor.label}: ${activePlayer.population[fallbackRole]}`,
		});
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
		const escapedLabel = descriptor.label.replace(
			/[.*+?^${}()|[\]\\]/g,
			'\\$&',
		);
		const statButton = screen.getByRole('button', {
			name: new RegExp(escapedLabel, 'i'),
		});
		expect(statButton).toBeInTheDocument();
		if (descriptor.icon) {
			expect(statButton.textContent).toContain(descriptor.icon);
		}
	});
});
