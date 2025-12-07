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
	displayableSecondaryResourceKeys,
	secondaryForecast,
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

// Convert legacy forecasts to format for the useNextTurnForecast mock
// The createForecastMap function expects values format
function buildForecastValues(): Record<string, number> {
	const values: Record<string, number> = {};
	// Convert resource forecasts to IDs
	for (const [legacyKey, delta] of Object.entries(resourceForecast)) {
		const v2Id = `resource:core:${legacyKey}`;
		values[v2Id] = delta;
	}
	// Convert secondary resource forecasts to IDs (camelCase to kebab-case)
	for (const [legacyKey, delta] of Object.entries(secondaryForecast)) {
		const kebab = legacyKey.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		const v2Id = `resource:core:${kebab}`;
		values[v2Id] = delta;
	}
	return values;
}

const forecastByPlayerId = {
	[activePlayerSnapshot.id]: {
		values: buildForecastValues(),
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
		// The component uses resources from resourceCatalog and metadata
		// Resource buttons have aria-label format "Label: value"
		const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalog;
		const v2Resources = resourceCatalog?.resources?.ordered ?? [];
		// Resources with groupId = null should be displayed in ResourceBar
		// Resources with a groupId are managed by other components
		const ungroupedResources = v2Resources.filter(
			(def) => def.groupId === null || def.groupId === undefined,
		);
		for (const definition of ungroupedResources) {
			const metadata = mockGame.translationContext.resourceMetadata.get(
				definition.id,
			);
			const value = activePlayerSnapshot.values?.[definition.id] ?? 0;
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
		expect(displayableSecondaryResourceKeys.length).toBeGreaterThan(0);
		renderPanel();
		// Component uses resources from resourceCatalog
		const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalog;
		const v2Resources = resourceCatalog?.resources?.ordered ?? [];
		// Resources with groupId = null should be displayed in ResourceBar
		const ungroupedResources = v2Resources.filter(
			(def) => def.groupId === null || def.groupId === undefined,
		);
		// Find first resource with a positive forecast - use ID directly
		const resourceWithPositiveForecast = ungroupedResources.find((def) => {
			const delta = forecastByPlayerId[activePlayerSnapshot.id].values[def.id];
			return (delta ?? 0) > 0;
		});
		if (resourceWithPositiveForecast) {
			const firstResource = resourceWithPositiveForecast;
			const firstResourceMetadata =
				mockGame.translationContext.resourceMetadata.get(firstResource.id);
			const firstResourceValue =
				activePlayerSnapshot.values?.[firstResource.id] ?? 0;
			// Get forecast using ID directly
			const resourceDelta =
				forecastByPlayerId[activePlayerSnapshot.id].values[firstResource.id];
			// Component uses parens around the delta
			const signedDelta = `${resourceDelta > 0 ? '+' : ''}${resourceDelta}`;
			const formattedResourceDelta = `(${signedDelta})`;
			const resourceLabel =
				`${firstResourceMetadata?.label ?? firstResource.id}: ` +
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
		const negativeResource = ungroupedResources.find((def) => {
			const delta = forecastByPlayerId[activePlayerSnapshot.id].values[def.id];
			return (delta ?? 0) < 0;
		});
		if (negativeResource) {
			const negMetadata = mockGame.translationContext.resourceMetadata.get(
				negativeResource.id,
			);
			const negValue = activePlayerSnapshot.values?.[negativeResource.id] ?? 0;
			const negDelta =
				forecastByPlayerId[activePlayerSnapshot.id].values[
					negativeResource.id
				]!;
			// Component uses parens around the delta
			const signedNegDelta = `${negDelta > 0 ? '+' : ''}${negDelta}`;
			const formattedNegDelta = `(${signedNegDelta})`;
			const negLabel =
				`${negMetadata?.label ?? negativeResource.id}: ` +
				`${negValue} ${formattedNegDelta}`;
			const negButtons = screen.getAllByRole('button', { name: negLabel });
			expect(negButtons.length).toBeGreaterThan(0);
			const [negButton] = negButtons;
			const negBadge = within(negButton).getByText(formattedNegDelta);
			expect(negBadge).toHaveClass('text-rose-300');
		}
		// Note: Grouped resources (groupId !== null) are rendered differently
		// inside ResourceGroupDisplay and don't have forecast badges in aria-label.
		// The above tests cover ungrouped resources with positive/negative forecasts.
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
