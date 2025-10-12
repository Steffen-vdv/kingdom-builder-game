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
	tieredResourceKey,
	fallbackResourceKey,
	fallbackResourceIcon,
	unknownPhaseId,
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

	it('resolves selector fallbacks and caches unknown phase descriptors', () => {
		renderPanel();
		const resourceDescriptor =
			metadataSelectors.resourceMetadata.select(fallbackResourceKey);
		if (fallbackResourceIcon) {
			expect(resourceDescriptor.icon).toBe(fallbackResourceIcon);
		}
		const registryResource = registries.resources[fallbackResourceKey];
		expect(resourceDescriptor.description).toBe(registryResource?.description);
		const passiveAsset = metadataSelectors.passiveMetadata.select();
		expect(passiveAsset.icon).toBe('♾️');
		const unknownPhase = metadataSelectors.phaseMetadata.select(unknownPhaseId);
		const cachedUnknownPhase =
			metadataSelectors.phaseMetadata.select(unknownPhaseId);
		expect(cachedUnknownPhase).toBe(unknownPhase);
		expect(unknownPhase.label).toBe('Phase:Unknown');
		expect(unknownPhase.icon).toBeUndefined();
		const tieredDescriptor =
			metadataSelectors.resourceMetadata.select(tieredResourceKey);
		expect(tieredDescriptor.label).toBe('Morale');
	});
});
