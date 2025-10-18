/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
import { formatStatValue } from '../src/utils/stats';
// prettier-ignore
import type {
	LegacyGameEngineContextValue,
} from '../src/state/GameContext.types';
import type { PlayerId } from '@kingdom-builder/engine';
import type { SessionStatSourceContribution } from '@kingdom-builder/protocol';

type HoverCardHandler = LegacyGameEngineContextValue['handleHoverCard'];
type HoverCardParam = Parameters<HoverCardHandler>[0];
type HoverCardMock = Mock<[HoverCardParam], void>;

interface PopulationInfoScenario {
	registries: ReturnType<typeof createTestSessionScaffold>['registries'];
	metadata: ReturnType<typeof createTestSessionScaffold>['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	activePlayer: ReturnType<typeof createSnapshotPlayer>;
	mockGame: LegacyGameEngineContextValue;
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

function getStatButtonsByLabel(label: string): HTMLButtonElement[] {
	const overviewButtons = screen.getAllByRole('button', {
		name: /stats overview/i,
	});
	const matches: HTMLButtonElement[] = [];
	for (const overviewButton of overviewButtons) {
		const statBar = overviewButton.closest('.stat-bar');
		if (!statBar) {
			continue;
		}
		const candidates = within(statBar).queryAllByRole('button', {
			name: label,
		});
		for (const candidate of candidates) {
			matches.push(candidate as HTMLButtonElement);
		}
	}
	return matches;
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
		statSources?: Record<string, Record<string, SessionStatSourceContribution>>;
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
		statSources: { ...(options.statSources ?? {}) },
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
		mockGame: mockGame as LegacyGameEngineContextValue,
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

	it('formats percent-based stats in the player stat bar', () => {
		scenario = createPopulationInfoScenario({
			playerStats: { growth: 0.25 },
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
			metadataSelectors.statMetadata.select('growth'),
		);
		const expectedValue = formatStatValue(
			'growth',
			0.25,
			currentGame.translationContext.assets,
		);
		const statButtons = getStatButtonsByLabel(
			`${descriptor.label}: ${expectedValue}`,
		);
		expect(statButtons.length).toBeGreaterThan(0);
		const [statButton] = statButtons;
		expect(statButton).toBeInTheDocument();
		expect(statButton.textContent).toContain(expectedValue);
	});

	it('includes percent-formatted values in stat hover cards', () => {
		const [primaryRole] = scenario.populationIds;
		const statSources: Record<
			string,
			Record<string, SessionStatSourceContribution>
		> = {
			growth: {
				legion: {
					amount: 0.25,
					meta: {
						key: 'growth',
						longevity: 'ongoing',
						kind: 'population',
						id: primaryRole,
					},
				},
			},
		};
		scenario = createPopulationInfoScenario({
			playerStats: { growth: 0.25 },
			statSources,
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
			metadataSelectors.statMetadata.select('growth'),
		);
		const expectedValue = formatStatValue(
			'growth',
			0.25,
			currentGame.translationContext.assets,
		);
		const statButtons = getStatButtonsByLabel(
			`${descriptor.label}: ${expectedValue}`,
		);
		expect(statButtons.length).toBeGreaterThan(0);
		const hoverMock = currentGame.handleHoverCard as unknown as HoverCardMock;
		const initialCalls = hoverMock.mock.calls.length;
		let hoveredButton: HTMLButtonElement | undefined;
		for (const candidate of statButtons) {
			fireEvent.mouseEnter(candidate);
			if (hoverMock.mock.calls.length > initialCalls) {
				hoveredButton = candidate;
				break;
			}
		}
		expect(hoveredButton).toBeDefined();
		expect(hoverMock.mock.calls.length).toBeGreaterThan(initialCalls);
		const lastCall = hoverMock.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		if (!lastCall) {
			return;
		}
		const hoverArgs = lastCall[0] as { effects?: unknown[] };
		const effects = Array.isArray(hoverArgs.effects) ? hoverArgs.effects : [];
		const effectTexts: string[] = [];
		for (const entry of effects) {
			if (typeof entry === 'string') {
				effectTexts.push(entry);
				continue;
			}
			if (entry && typeof entry === 'object' && 'items' in entry) {
				const items = (entry as { items?: unknown[] }).items;
				if (Array.isArray(items)) {
					for (const item of items) {
						if (typeof item === 'string') {
							effectTexts.push(item);
						}
					}
				}
			}
		}
		expect(effectTexts.some((text) => text.includes(expectedValue))).toBe(true);
	});
});
