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
		it('shows description but no effects section for resource hover cards', () => {
			const resourceCatalog = mockGame.sessionSnapshot.game.resourceCatalogV2;
			if (!resourceCatalog) {
				throw new Error('Expected resourceCatalogV2');
			}
			// Find a category with at least one non-grouped resource
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
			// The effects array should be empty for resources
			// (unlike lands/developments which have effect summaries)
			expect(lastHoverCard!.effects).toEqual([]);
			// Title should be set
			expect(lastHoverCard!.title).toBeTruthy();
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
