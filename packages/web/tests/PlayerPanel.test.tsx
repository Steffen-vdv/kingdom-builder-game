/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PlayerPanel from '../src/components/player/PlayerPanel';
import { formatStatValue } from '../src/utils/stats';
import { createPlayerPanelFixtures } from './helpers/playerPanelFixtures';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from '../src/components/player/registryDisplays';

const {
	activePlayer: activePlayerSnapshot,
	mockGame,
	resourceForecast,
	displayableStatKeys,
	statForecast,
	registries,
	metadata,
	metadataSelectors,
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
		for (const descriptor of metadataSelectors.resourceMetadata.list) {
			const display = toDescriptorDisplay(descriptor);
			const amount = activePlayerSnapshot.resources[display.id] ?? 0;
			const icon = display.icon ?? '❔';
			expect(screen.getByText(`${icon}${amount}`)).toBeInTheDocument();
		}
	});

	it('renders next-turn forecasts with accessible labels', () => {
		expect(displayableStatKeys.length).toBeGreaterThan(0);
		renderPanel();
		const resourceDisplays = metadataSelectors.resourceMetadata.list.map(
			(descriptor) => toDescriptorDisplay(descriptor),
		);
		const [firstResourceDescriptor] = resourceDisplays;
		const firstResourceKey = firstResourceDescriptor.id;
		const playerResources = activePlayerSnapshot.resources;
		const resourceInfo = firstResourceDescriptor;
		const resourceValue = playerResources[firstResourceKey] ?? 0;
		const resourceDelta = resourceForecast[firstResourceKey]!;
		const formattedResourceDelta = `${resourceDelta > 0 ? '+' : ''}${resourceDelta}`;
		const resourceLabel =
			`${resourceInfo.label ?? firstResourceKey}: ${resourceValue} ` +
			`(${formattedResourceDelta})`;
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
		const negativeResourceDescriptor = resourceDisplays.find(
			(display) => resourceForecast[display.id]! < 0,
		);
		if (negativeResourceDescriptor) {
			const negativeResourceValue =
				playerResources[negativeResourceDescriptor.id] ?? 0;
			const negativeResourceDelta =
				resourceForecast[negativeResourceDescriptor.id]!;
			const formattedNegativeDelta = `${
				negativeResourceDelta > 0 ? '+' : ''
			}${negativeResourceDelta}`;
			const negativeResourceLabel =
				`${negativeResourceDescriptor.label ?? negativeResourceDescriptor.id}: ` +
				`${negativeResourceValue} (${formattedNegativeDelta})`;
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
		const statDescriptor = toDescriptorDisplay(
			metadataSelectors.statMetadata.select(firstStatKey),
		);
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

	it('memoizes registry metadata selectors', () => {
		const descriptor = metadataSelectors.resourceMetadata.list.at(-1);
		expect(descriptor).toBeDefined();
		if (!descriptor) {
			throw new Error('Expected resource metadata descriptor.');
		}
		const first = metadataSelectors.resourceMetadata.select(descriptor.id);
		const second = metadataSelectors.resourceMetadata.select(descriptor.id);
		expect(second).toBe(first);
		const many = metadataSelectors.resourceMetadata.selectMany([
			descriptor.id,
			descriptor.id,
		]);
		expect(many[0]).toBe(first);
		const record = metadataSelectors.resourceMetadata.selectRecord([
			descriptor.id,
		]);
		expect(record[descriptor.id]).toBe(first);
	});
});
