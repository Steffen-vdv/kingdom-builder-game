/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PlayerPanel from '../src/components/player/PlayerPanel';
import { RESOURCES, STATS } from '@kingdom-builder/contents';
import { formatStatValue } from '../src/utils/stats';
import { createPlayerPanelFixtures } from './helpers/playerPanelFixtures';

const {
	activePlayer: activePlayerSnapshot,
	mockGame,
	resourceForecast,
	displayableStatKeys,
	statForecast,
} = createPlayerPanelFixtures();

const forecastByPlayerId = {
	[activePlayerSnapshot.id]: {
		resources: resourceForecast,
		stats: statForecast,
		population: {},
	},
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

vi.mock('../src/state/useNextTurnForecast', () => ({
	useNextTurnForecast: () => forecastByPlayerId,
}));

describe('<PlayerPanel />', () => {
	it('renders player name and resource icons', () => {
		render(<PlayerPanel player={activePlayerSnapshot} />);
		expect(screen.getByText(activePlayerSnapshot.name)).toBeInTheDocument();
		for (const [key, info] of Object.entries(RESOURCES)) {
			const amount = activePlayerSnapshot.resources[key] ?? 0;
			expect(screen.getByText(`${info.icon}${amount}`)).toBeInTheDocument();
		}
	});

	it('renders next-turn forecasts with accessible labels', () => {
		expect(displayableStatKeys.length).toBeGreaterThan(0);
		render(<PlayerPanel player={activePlayerSnapshot} />);
		const [firstResourceKey] = Object.keys(RESOURCES);
		const playerResources = activePlayerSnapshot.resources;
		const resourceInfo = RESOURCES[firstResourceKey];
		const resourceValue = playerResources[firstResourceKey] ?? 0;
		const resourceDelta = resourceForecast[firstResourceKey]!;
		const formattedResourceDelta = `${resourceDelta > 0 ? '+' : ''}${resourceDelta}`;
		const resourceLabel = `${resourceInfo.label}: ${resourceValue} (${formattedResourceDelta})`;
		const resourceButtons = screen.getAllByRole('button', {
			name: resourceLabel,
		});
		expect(resourceButtons.length).toBeGreaterThan(0);
		const [resourceButton] = resourceButtons;
		const resourceForecastBadge = within(resourceButton).getByText(
			`(${formattedResourceDelta})`,
		);
		expect(resourceForecastBadge).toBeInTheDocument();
		expect(resourceForecastBadge).toHaveClass('text-emerald-300');
		const negativeResourceKey = Object.keys(RESOURCES).find(
			(key) => resourceForecast[key]! < 0,
		);
		if (negativeResourceKey) {
			const negativeResourceInfo = RESOURCES[negativeResourceKey];
			const negativeResourceValue = playerResources[negativeResourceKey] ?? 0;
			const negativeResourceDelta = resourceForecast[negativeResourceKey]!;
			const formattedNegativeDelta = `${
				negativeResourceDelta > 0 ? '+' : ''
			}${negativeResourceDelta}`;
			const negativeResourceLabel = `${negativeResourceInfo.label}: ${negativeResourceValue} (${formattedNegativeDelta})`;
			const negativeResourceButtons = screen.getAllByRole('button', {
				name: negativeResourceLabel,
			});
			expect(negativeResourceButtons.length).toBeGreaterThan(0);
			const [negativeResourceButton] = negativeResourceButtons;
			const negativeForecastBadge = within(negativeResourceButton).getByText(
				`(${formattedNegativeDelta})`,
			);
			expect(negativeForecastBadge).toHaveClass('text-rose-300');
		}
		const [firstStatKey] = displayableStatKeys;
		const statInfo = STATS[firstStatKey as keyof typeof STATS];
		const statValue = activePlayerSnapshot.stats[firstStatKey] ?? 0;
		const formattedStatValue = formatStatValue(
			firstStatKey as keyof typeof STATS,
			statValue,
		);
		const statDelta = statForecast[firstStatKey]!;
		const formattedStatDelta = `${statDelta > 0 ? '+' : '-'}${formatStatValue(
			firstStatKey as keyof typeof STATS,
			Math.abs(statDelta),
		)}`;
		const statButtons = screen.getAllByRole('button', {
			name: `${statInfo.label}: ${formattedStatValue} (${formattedStatDelta})`,
		});
		expect(statButtons.length).toBeGreaterThan(0);
		const [statButton] = statButtons;
		const statForecastBadge = within(statButton).getByText(
			`(${formattedStatDelta})`,
		);
		expect(statForecastBadge).toBeInTheDocument();
		expect(statForecastBadge).toHaveClass('text-emerald-300');
	});
});
