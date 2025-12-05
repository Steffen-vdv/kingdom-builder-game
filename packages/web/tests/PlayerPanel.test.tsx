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
import { getLegacyMapping } from '../src/components/player/resourceV2Snapshots';

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
	useOptionalGameEngine: () => mockGame,
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
		// The component uses V2 resources from resourceCatalogV2 and V2 metadata
		// Resource buttons have aria-label format "Label: value"
		const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
		const v2Resources = resourceCatalog?.resources?.ordered ?? [];
		// Filter to only core resources (not stats or population roles)
		const coreResources = v2Resources.filter(
			(def) =>
				!def.id.includes(':stat:') && !def.id.includes(':population:role:'),
		);
		for (const definition of coreResources) {
			const metadata = mockGame.translationContext.resourceMetadataV2.get(
				definition.id,
			);
			const value = activePlayerSnapshot.valuesV2?.[definition.id] ?? 0;
			const label = metadata?.label ?? definition.id;
			// Get forecast for this resource using legacy mapping
			const mapping = getLegacyMapping(definition.id);
			const legacyKey = mapping?.key ?? definition.id;
			const _delta = resourceForecast[legacyKey];
			// Resource buttons may include forecast: "Label: value (+delta)"
			// Use regex to match with/without forecast (escape label for regex)
			const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const buttons = screen.getAllByRole('button', {
				name: new RegExp(`^${escapedLabel}: ${value}(\\s+\\([+-]?\\d+\\))?$`),
			});
			expect(buttons.length).toBeGreaterThan(0);
		}
	});

	it('renders next-turn forecasts with accessible labels', () => {
		expect(displayableStatKeys.length).toBeGreaterThan(0);
		renderPanel();
		// Component uses V2 resources from resourceCatalogV2
		const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
		const v2Resources = resourceCatalog?.resources?.ordered ?? [];
		// Filter to only core resources (not stats or population roles)
		const coreResources = v2Resources.filter(
			(def) =>
				!def.id.includes(':stat:') && !def.id.includes(':population:role:'),
		);
		// Find first resource with a positive forecast
		const resourceWithPositiveForecast = coreResources.find((def) => {
			const mapping = getLegacyMapping(def.id);
			const key = mapping?.key ?? def.id;
			return (resourceForecast[key] ?? 0) > 0;
		});
		if (resourceWithPositiveForecast) {
			const firstV2Resource = resourceWithPositiveForecast;
			const firstResourceMetadata =
				mockGame.translationContext.resourceMetadataV2.get(firstV2Resource.id);
			const firstResourceValue =
				activePlayerSnapshot.valuesV2?.[firstV2Resource.id] ?? 0;
			// Get forecast using legacy mapping
			const mapping = getLegacyMapping(firstV2Resource.id);
			const legacyKey = mapping?.key ?? firstV2Resource.id;
			const resourceDelta = resourceForecast[legacyKey]!;
			const formattedResourceDelta = `${resourceDelta > 0 ? '+' : ''}${resourceDelta}`;
			const resourceLabel =
				`${firstResourceMetadata?.label ?? firstV2Resource.id}: ` +
				`${firstResourceValue} (${formattedResourceDelta})`;
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
		}
		// Find a resource with negative forecast
		const negativeV2Resource = coreResources.find((def) => {
			const mapping = getLegacyMapping(def.id);
			const key = mapping?.key ?? def.id;
			return (resourceForecast[key] ?? 0) < 0;
		});
		if (negativeV2Resource) {
			const negMapping = getLegacyMapping(negativeV2Resource.id);
			const negLegacyKey = negMapping?.key ?? negativeV2Resource.id;
			const negMetadata = mockGame.translationContext.resourceMetadataV2.get(
				negativeV2Resource.id,
			);
			const negValue =
				activePlayerSnapshot.valuesV2?.[negativeV2Resource.id] ?? 0;
			const negDelta = resourceForecast[negLegacyKey]!;
			const formattedNegDelta = `${negDelta > 0 ? '+' : ''}${negDelta}`;
			const negLabel =
				`${negMetadata?.label ?? negativeV2Resource.id}: ` +
				`${negValue} (${formattedNegDelta})`;
			const negButtons = screen.getAllByRole('button', { name: negLabel });
			expect(negButtons.length).toBeGreaterThan(0);
			const [negButton] = negButtons;
			const negBadge = within(negButton).getByText(`(${formattedNegDelta})`);
			expect(negBadge).toHaveClass('text-rose-300');
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
