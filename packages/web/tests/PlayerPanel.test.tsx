/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PlayerPanel from '../src/components/player/PlayerPanel';
import { formatStatValue } from '../src/utils/stats';
import { createPlayerPanelFixtures } from './helpers/playerPanelFixtures';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';

const {
	activePlayer: activePlayerSnapshot,
	mockGame,
	resourceForecast,
	displayableStatKeys,
	statForecast,
	registries,
	metadata,
} = createPlayerPanelFixtures();

const renderPanel = () =>
	render(
		<RegistryMetadataProvider registries={registries} metadata={metadata}>
			<PlayerPanel player={activePlayerSnapshot} />
		</RegistryMetadataProvider>,
	);

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

const resolveDescriptorLabel = (
	id: string,
	descriptor?: { label?: string | undefined },
): string => {
	const trimmed = descriptor?.label?.trim();
	if (trimmed && trimmed.length > 0) {
		return trimmed;
	}
	const spaced = id.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return id;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

describe('<PlayerPanel />', () => {
	it('renders player name and resource icons', () => {
		renderPanel();
		expect(screen.getByText(activePlayerSnapshot.name)).toBeInTheDocument();
		for (const [key, info] of Object.entries(
			mockGame.translationContext.assets.resources,
		)) {
			const amount = activePlayerSnapshot.resources[key] ?? 0;
			const icon = info.icon ?? '';
			expect(screen.getByText(`${icon}${amount}`)).toBeInTheDocument();
		}
	});

	it('renders next-turn forecasts with accessible labels', () => {
		expect(displayableStatKeys.length).toBeGreaterThan(0);
		renderPanel();
		const assets = mockGame.translationContext.assets;
		const [firstResourceKey] = Object.keys(assets.resources);
		const playerResources = activePlayerSnapshot.resources;
		const resourceInfo = assets.resources[firstResourceKey];
		const resourceValue = playerResources[firstResourceKey] ?? 0;
		const resourceDelta = resourceForecast[firstResourceKey]!;
		const formattedResourceDelta = `${resourceDelta > 0 ? '+' : ''}${resourceDelta}`;
		const resourceLabel = `${resourceInfo.label ?? firstResourceKey}: ${resourceValue} (${formattedResourceDelta})`;
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
		const negativeResourceKey = Object.keys(assets.resources).find(
			(key) => resourceForecast[key]! < 0,
		);
		if (negativeResourceKey) {
			const negativeResourceInfo = assets.resources[negativeResourceKey];
			const negativeResourceValue = playerResources[negativeResourceKey] ?? 0;
			const negativeResourceDelta = resourceForecast[negativeResourceKey]!;
			const formattedNegativeDelta = `${
				negativeResourceDelta > 0 ? '+' : ''
			}${negativeResourceDelta}`;
			const negativeResourceLabel = `${
				negativeResourceInfo.label ?? negativeResourceKey
			}: ${negativeResourceValue} (${formattedNegativeDelta})`;
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
		const statDescriptor = (
			(metadata.stats ?? {}) as Record<string, { label?: string }>
		)[firstStatKey];
		const statLabel = resolveDescriptorLabel(firstStatKey, statDescriptor);
		const statValue = activePlayerSnapshot.stats[firstStatKey] ?? 0;
		const formattedStatValue = formatStatValue(firstStatKey, statValue);
		const statDelta = statForecast[firstStatKey]!;
		const formattedStatDelta = `${statDelta > 0 ? '+' : '-'}${formatStatValue(
			firstStatKey,
			Math.abs(statDelta),
		)}`;
		const statButtons = screen.getAllByRole('button', {
			name: `${statLabel}: ${formattedStatValue} (${formattedStatDelta})`,
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
