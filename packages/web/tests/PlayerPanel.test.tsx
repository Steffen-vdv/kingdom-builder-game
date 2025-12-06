/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PlayerPanel from '../src/components/player/PlayerPanel';
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
	metadataSelectors,
} = createPlayerPanelFixtures();

const renderPanel = () =>
	render(
		<RegistryMetadataProvider registries={registries} metadata={metadata}>
			<PlayerPanel player={activePlayerSnapshot} />
		</RegistryMetadataProvider>,
	);

// Convert legacy forecasts to V2 format for the useNextTurnForecast mock
// The createForecastMap function expects valuesV2 format
function buildV2ForecastValues(): Record<string, number> {
	const valuesV2: Record<string, number> = {};
	// Convert resource forecasts to V2 IDs
	for (const [legacyKey, delta] of Object.entries(resourceForecast)) {
		const v2Id = `resource:core:${legacyKey}`;
		valuesV2[v2Id] = delta;
	}
	// Convert stat forecasts to V2 IDs (camelCase to kebab-case)
	for (const [legacyKey, delta] of Object.entries(statForecast)) {
		const kebab = legacyKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		const v2Id = `resource:core:${kebab}`;
		valuesV2[v2Id] = delta;
	}
	return valuesV2;
}

const forecastByPlayerId = {
	[activePlayerSnapshot.id]: {
		valuesV2: buildV2ForecastValues(),
	},
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
	useOptionalGameEngine: () => mockGame,
}));

vi.mock('../src/state/useNextTurnForecast', () => ({
	useNextTurnForecast: () => forecastByPlayerId,
}));

describe('<PlayerPanel />', () => {
	it('renders player name and resource icons', () => {
		renderPanel();
		expect(screen.getByText(activePlayerSnapshot.name)).toBeInTheDocument();
		// The component uses V2 resources from resourceCatalogV2 and V2 metadata
		// Resource buttons have aria-label format "Label: value"
		const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
		const v2Resources = resourceCatalog?.resources?.ordered ?? [];
		// Resources with groupId = null should be displayed in ResourceBar
		// Resources with a groupId are managed by other components
		const ungroupedResources = v2Resources.filter(
			(def) => def.groupId === null || def.groupId === undefined,
		);
		for (const definition of ungroupedResources) {
			const metadata = mockGame.translationContext.resourceMetadataV2.get(
				definition.id,
			);
			const value = activePlayerSnapshot.valuesV2?.[definition.id] ?? 0;
			const label = metadata?.label ?? definition.id;
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
		// Resources with groupId = null should be displayed in ResourceBar
		const ungroupedResources = v2Resources.filter(
			(def) => def.groupId === null || def.groupId === undefined,
		);
		// Find first resource with a positive forecast - use V2 ID directly
		const resourceWithPositiveForecast = ungroupedResources.find((def) => {
			const delta =
				forecastByPlayerId[activePlayerSnapshot.id].valuesV2[def.id];
			return (delta ?? 0) > 0;
		});
		if (resourceWithPositiveForecast) {
			const firstV2Resource = resourceWithPositiveForecast;
			const firstResourceMetadata =
				mockGame.translationContext.resourceMetadataV2.get(firstV2Resource.id);
			const firstResourceValue =
				activePlayerSnapshot.valuesV2?.[firstV2Resource.id] ?? 0;
			// Get forecast using V2 ID directly
			const resourceDelta =
				forecastByPlayerId[activePlayerSnapshot.id].valuesV2[
					firstV2Resource.id
				];
			// Component uses parens around the delta
			const signedDelta = `${resourceDelta > 0 ? '+' : ''}${resourceDelta}`;
			const formattedResourceDelta = `(${signedDelta})`;
			const resourceLabel =
				`${firstResourceMetadata?.label ?? firstV2Resource.id}: ` +
				`${firstResourceValue} ${formattedResourceDelta}`;
			const resourceButtons = screen.getAllByRole('button', {
				name: resourceLabel,
			});
			expect(resourceButtons.length).toBeGreaterThan(0);
			const [resourceButton] = resourceButtons;
			// Badge text uses parens around the signed number
			const resourceForecastBadge = within(resourceButton).getByText(
				formattedResourceDelta,
			);
			expect(resourceForecastBadge).toBeInTheDocument();
			expect(resourceForecastBadge).toHaveClass('text-emerald-300');
		}
		// Find a resource with negative forecast
		const negativeV2Resource = ungroupedResources.find((def) => {
			const delta =
				forecastByPlayerId[activePlayerSnapshot.id].valuesV2[def.id];
			return (delta ?? 0) < 0;
		});
		if (negativeV2Resource) {
			const negMetadata = mockGame.translationContext.resourceMetadataV2.get(
				negativeV2Resource.id,
			);
			const negValue =
				activePlayerSnapshot.valuesV2?.[negativeV2Resource.id] ?? 0;
			const negDelta =
				forecastByPlayerId[activePlayerSnapshot.id].valuesV2[
					negativeV2Resource.id
				]!;
			// Component uses parens around the delta
			const signedNegDelta = `${negDelta > 0 ? '+' : ''}${negDelta}`;
			const formattedNegDelta = `(${signedNegDelta})`;
			const negLabel =
				`${negMetadata?.label ?? negativeV2Resource.id}: ` +
				`${negValue} ${formattedNegDelta}`;
			const negButtons = screen.getAllByRole('button', { name: negLabel });
			expect(negButtons.length).toBeGreaterThan(0);
			const [negButton] = negButtons;
			const negBadge = within(negButton).getByText(formattedNegDelta);
			expect(negBadge).toHaveClass('text-rose-300');
		}
		// Find a stat V2 resource with positive forecast
		const statV2Resources = v2Resources.filter((def) =>
			def.id.includes(':stat:'),
		);
		const firstStatV2 = statV2Resources.find((def) => {
			const delta =
				forecastByPlayerId[activePlayerSnapshot.id].valuesV2[def.id];
			return (delta ?? 0) > 0;
		});
		if (firstStatV2) {
			const statMetadata = mockGame.translationContext.resourceMetadataV2.get(
				firstStatV2.id,
			);
			const statLabel = statMetadata?.label ?? firstStatV2.id;
			const statValue = activePlayerSnapshot.valuesV2?.[firstStatV2.id] ?? 0;
			const statDelta =
				forecastByPlayerId[activePlayerSnapshot.id].valuesV2[firstStatV2.id]!;
			// Component uses parens around the delta
			const signedStatDelta = `${statDelta > 0 ? '+' : ''}${statDelta}`;
			const formattedStatDelta = `(${signedStatDelta})`;
			const statButtons = screen.getAllByRole('button', {
				name: `${statLabel}: ${statValue} ${formattedStatDelta}`,
			});
			expect(statButtons.length).toBeGreaterThan(0);
			const [statButton] = statButtons;
			const statForecastBadge =
				within(statButton).getByText(formattedStatDelta);
			expect(statForecastBadge).toBeInTheDocument();
			expect(statForecastBadge).toHaveClass('text-emerald-300');
		}
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
