/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ResourceCategoryRow from '../../../src/components/player/ResourceCategoryRow';
import ResourceGroupDisplay from '../../../src/components/player/ResourceGroupDisplay';
import { createPlayerPanelFixtures } from '../../helpers/playerPanelFixtures';
import { RegistryMetadataProvider } from '../../../src/contexts/RegistryMetadataContext';
import type { HoverCard } from '../../../src/state/useHoverCard';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceCategoryDefinitionV2,
	SessionResourceGroupDefinitionV2,
} from '@kingdom-builder/protocol';

const {
	activePlayer: activePlayerSnapshot,
	mockGame,
	registries,
	metadata,
} = createPlayerPanelFixtures();

// Track the last hover card passed to handleHoverCard
let lastHoverCard: HoverCard | null = null;
const handleHoverCardSpy = vi.fn((card: HoverCard) => {
	lastHoverCard = card;
});
mockGame.handleHoverCard = handleHoverCardSpy;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
	useOptionalGameEngine: () => mockGame,
}));

vi.mock('../../../src/state/useNextTurnForecast', () => ({
	useNextTurnForecast: () => ({}),
}));

beforeEach(() => {
	lastHoverCard = null;
	handleHoverCardSpy.mockClear();
});

describe('Resource HoverCard behavior', () => {
	describe('ResourceCategoryRow', () => {
		it('shows description but no effects for non-tiered resources', () => {
			const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
			if (!resourceCatalog) {
				throw new Error('Expected resourceCatalogV2');
			}
			const tieredResourceKey = mockGame.ruleSnapshot.tieredResourceKey;
			// Find a category with at least one non-grouped, non-tiered resource
			const category = resourceCatalog.categories.ordered.find((cat) =>
				cat.contents.some(
					(item) => item.type === 'resource' && item.id !== tieredResourceKey,
				),
			);
			if (!category) {
				throw new Error('Expected category with non-tiered resources');
			}
			// Filter to only include non-tiered resources for this test
			const filteredCategory = {
				...category,
				contents: category.contents.filter(
					(item) => item.type !== 'resource' || item.id !== tieredResourceKey,
				),
			};
			render(
				<RegistryMetadataProvider registries={registries} metadata={metadata}>
					<ResourceCategoryRow
						category={filteredCategory as SessionResourceCategoryDefinitionV2}
						player={activePlayerSnapshot}
					/>
				</RegistryMetadataProvider>,
			);
			// Find any resource button and hover over it
			const resourceButtons = screen.getAllByRole('button');
			const resourceButton = resourceButtons.find(
				(btn) => !btn.classList.contains('info-bar__icon'),
			);
			if (!resourceButton) {
				throw new Error('Expected at least one resource button');
			}
			fireEvent.mouseEnter(resourceButton);
			expect(handleHoverCardSpy).toHaveBeenCalled();
			expect(lastHoverCard).not.toBeNull();
			// The effects array should be empty for non-tiered resources
			expect(lastHoverCard!.effects).toEqual([]);
			// Title should be set
			expect(lastHoverCard!.title).toBeTruthy();
		});

		it('shows tier entries for tiered resources (e.g., happiness)', () => {
			const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
			if (!resourceCatalog) {
				throw new Error('Expected resourceCatalogV2');
			}
			const tieredResourceKey = mockGame.ruleSnapshot.tieredResourceKey;
			// Get metadata for the tiered resource to find its icon
			const tieredMeta =
				mockGame.translationContext.resourceMetadataV2.get(tieredResourceKey);
			const tieredIcon = tieredMeta.icon;

			// Find a category containing the tiered resource
			const category = resourceCatalog.categories.ordered.find((cat) =>
				cat.contents.some(
					(item) => item.type === 'resource' && item.id === tieredResourceKey,
				),
			);
			if (!category) {
				// If tiered resource is not in any category, skip this test
				return;
			}
			// Create a category with only the tiered resource
			const tieredOnlyCategory = {
				...category,
				contents: category.contents.filter(
					(item) => item.type === 'resource' && item.id === tieredResourceKey,
				),
			};
			render(
				<RegistryMetadataProvider registries={registries} metadata={metadata}>
					<ResourceCategoryRow
						category={tieredOnlyCategory as SessionResourceCategoryDefinitionV2}
						player={activePlayerSnapshot}
					/>
				</RegistryMetadataProvider>,
			);
			// Find the button containing the tiered resource's icon
			const resourceButtons = screen.getAllByRole('button');
			const resourceButton = resourceButtons.find((btn) => {
				// Skip category icon buttons
				if (btn.classList.contains('info-bar__icon')) {
					return false;
				}
				// Find button with the tiered resource icon
				return tieredIcon && btn.textContent?.includes(tieredIcon);
			});
			if (!resourceButton) {
				// Resource might not be rendered (not in valuesV2 or hidden)
				// Let's check what buttons exist for debugging
				const buttonContents = resourceButtons.map((btn) => btn.textContent);
				throw new Error(
					`Expected tiered resource button with icon "${tieredIcon}". ` +
						`Found buttons: ${JSON.stringify(buttonContents)}`,
				);
			}
			fireEvent.mouseEnter(resourceButton);
			expect(handleHoverCardSpy).toHaveBeenCalled();
			expect(lastHoverCard).not.toBeNull();
			// Tiered resources should have tier entries in effects
			expect(lastHoverCard!.effects.length).toBeGreaterThan(0);
			// Each effect should be a SummaryGroup with title and items
			for (const effect of lastHoverCard!.effects) {
				expect(typeof effect).toBe('object');
				expect(effect).toHaveProperty('title');
				expect(effect).toHaveProperty('items');
			}
		});

		it('uses passive-based tier detection over value-based when desync occurs', () => {
			// This test verifies that tier detection prioritizes passives
			// (authoritative) over range-based value checks. The previous
			// value-only implementation would fail this test by showing neutral
			// tier instead of joyous tier.
			const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
			if (!resourceCatalog) {
				throw new Error('Expected resourceCatalogV2');
			}
			const tieredResourceKey = mockGame.ruleSnapshot.tieredResourceKey;
			const tierDefinitions = mockGame.ruleSnapshot.tierDefinitions;

			// Find the joyous tier (has passive) and neutral tier (no passive)
			const joyousTier = tierDefinitions.find((t) => t.preview?.id);
			const neutralTier = tierDefinitions.find((t) => !t.preview?.id);
			if (!joyousTier || !neutralTier) {
				throw new Error('Expected both joyous and neutral tiers');
			}

			// Create a player with:
			// - joyous tier passive (authoritative indicator of joyous tier)
			// - resource value in neutral tier range (would indicate neutral if
			//   using value-only check)
			const neutralRangeValue = (neutralTier.range.min ?? 0) + 1; // e.g., 5
			const playerWithDesync: SessionPlayerStateSnapshot = {
				...activePlayerSnapshot,
				passives: [
					{
						id: joyousTier.preview!.id,
						name: joyousTier.display?.title,
						icon: joyousTier.display?.icon,
					},
				],
				valuesV2: {
					...activePlayerSnapshot.valuesV2,
					[tieredResourceKey]: neutralRangeValue,
				},
			};

			// Find a category containing the tiered resource
			const category = resourceCatalog.categories.ordered.find((cat) =>
				cat.contents.some(
					(item) => item.type === 'resource' && item.id === tieredResourceKey,
				),
			);
			if (!category) {
				return; // Skip if tiered resource not in any category
			}
			const tieredOnlyCategory = {
				...category,
				contents: category.contents.filter(
					(item) => item.type === 'resource' && item.id === tieredResourceKey,
				),
			};

			const tieredMeta =
				mockGame.translationContext.resourceMetadataV2.get(tieredResourceKey);
			const tieredIcon = tieredMeta.icon;

			render(
				<RegistryMetadataProvider registries={registries} metadata={metadata}>
					<ResourceCategoryRow
						category={tieredOnlyCategory as SessionResourceCategoryDefinitionV2}
						player={playerWithDesync}
					/>
				</RegistryMetadataProvider>,
			);

			const resourceButtons = screen.getAllByRole('button');
			const resourceButton = resourceButtons.find((btn) => {
				if (btn.classList.contains('info-bar__icon')) {
					return false;
				}
				return tieredIcon && btn.textContent?.includes(tieredIcon);
			});
			if (!resourceButton) {
				throw new Error('Expected tiered resource button');
			}

			fireEvent.mouseEnter(resourceButton);
			expect(lastHoverCard).not.toBeNull();

			// The hover card should show tier effects with joyous tier highlighted
			// (from passive), not neutral tier (from value range)
			const effects = lastHoverCard!.effects;
			expect(effects.length).toBeGreaterThan(0);

			// Find the effect group that's marked as active (the joyous tier)
			// The active tier should be joyous (from passive), even though value
			// is in neutral range
			const joyousTierTitle = joyousTier.display?.title ?? joyousTier.id;
			const hasJoyousTierEntry = effects.some(
				(effect) =>
					typeof effect === 'object' &&
					'title' in effect &&
					typeof effect.title === 'string' &&
					effect.title.includes(joyousTierTitle),
			);
			expect(hasJoyousTierEntry).toBe(true);
		});

		it('does not pass Value/Bounds groups to effects for resources', () => {
			const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
			if (!resourceCatalog) {
				throw new Error('Expected resourceCatalogV2');
			}
			const category = resourceCatalog.categories.ordered.find((cat) =>
				cat.contents.some((item) => item.type === 'resource'),
			);
			if (!category) {
				throw new Error('Expected category with resources');
			}
			render(
				<RegistryMetadataProvider registries={registries} metadata={metadata}>
					<ResourceCategoryRow
						category={category as SessionResourceCategoryDefinitionV2}
						player={activePlayerSnapshot}
					/>
				</RegistryMetadataProvider>,
			);
			const resourceButtons = screen.getAllByRole('button');
			const resourceButton = resourceButtons.find(
				(btn) => !btn.classList.contains('info-bar__icon'),
			);
			if (!resourceButton) {
				throw new Error('Expected at least one resource button');
			}
			fireEvent.mouseEnter(resourceButton);
			expect(lastHoverCard).not.toBeNull();
			// Ensure no Value or Bounds summary groups are passed
			const effects = lastHoverCard!.effects;
			const hasValueGroup = effects.some(
				(item) =>
					typeof item === 'object' && 'title' in item && item.title === 'Value',
			);
			const hasBoundsGroup = effects.some(
				(item) =>
					typeof item === 'object' &&
					'title' in item &&
					item.title === 'Bounds',
			);
			expect(hasValueGroup).toBe(false);
			expect(hasBoundsGroup).toBe(false);
		});
	});

	describe('ResourceGroupDisplay', () => {
		it('displays the parent icon in the rendered output', () => {
			const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
			if (!resourceCatalog) {
				throw new Error('Expected resourceCatalogV2');
			}
			// Find a group with a parent that has an icon
			const groupWithParent = resourceCatalog.groups.ordered.find(
				(group) => group.parent?.icon,
			);
			if (!groupWithParent) {
				// Skip test if no group with parent icon exists
				return;
			}
			render(
				<RegistryMetadataProvider registries={registries} metadata={metadata}>
					<ResourceGroupDisplay
						groupId={groupWithParent.id}
						player={activePlayerSnapshot}
						isPrimaryCategory={true}
					/>
				</RegistryMetadataProvider>,
			);
			// The parent icon should be rendered with aria-hidden="true"
			const parentIcon = groupWithParent.parent!.icon;
			const iconSpans = screen.getAllByText(parentIcon);
			expect(iconSpans.length).toBeGreaterThan(0);
			// At least one should have aria-hidden for the parent icon
			const hiddenIconSpan = iconSpans.find(
				(span) => span.getAttribute('aria-hidden') === 'true',
			);
			expect(hiddenIconSpan).toBeTruthy();
		});

		it('uses group metadata (with parent icon) over resource metadata', () => {
			const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
			if (!resourceCatalog) {
				throw new Error('Expected resourceCatalogV2');
			}
			// Find a group with a parent that has an icon
			const groupWithParent = resourceCatalog.groups.ordered.find(
				(group) => group.parent?.icon,
			) as SessionResourceGroupDefinitionV2 | undefined;
			if (!groupWithParent) {
				return;
			}
			// Get the group metadata which should have the parent's icon
			const groupMetadata =
				mockGame.translationContext.resourceGroupMetadataV2.get(
					groupWithParent.id,
				);
			// Verify the group metadata has the icon from the parent
			expect(groupMetadata.icon).toBe(groupWithParent.parent!.icon);
		});
	});
});
