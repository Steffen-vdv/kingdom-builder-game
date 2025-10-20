/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ActionsPanel from '../../../src/components/actions/ActionsPanel';
import { RegistryMetadataProvider } from '../../../src/contexts/RegistryMetadataContext';
import { createActionsPanelGame } from '../../helpers/actionsPanel';
import type { ActionsPanelTestHarness } from '../../helpers/actionsPanel.types';
import {
	clearSessionActionMetadataStore,
	seedSessionActionMetadata,
} from '../../helpers/mockSessionActionMetadataStore';
import * as translationModule from '../../../src/translation';

vi.mock('../../../src/state/sessionSdk', async () => {
	const actual = (await vi.importActual(
		'../../../src/state/sessionSdk',
	)) as Record<string, unknown>;
	return {
		...actual,
		loadActionCosts: vi.fn(() => Promise.resolve({})),
		loadActionRequirements: vi.fn(() => Promise.resolve([])),
		loadActionOptions: vi.fn(() => Promise.resolve([])),
	};
});

let harness: ActionsPanelTestHarness;
let currentGame: ActionsPanelTestHarness;
let summarizeSpy: ReturnType<typeof vi.spyOn> | null = null;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

describe('<ActionsPanel />', () => {
	beforeEach(() => {
		clearSessionActionMetadataStore();
		harness = createActionsPanelGame({ showBuilding: true });
		currentGame = harness;
		const actionDefinitions = Object.values(harness.metadata.actions).filter(
			(definition): definition is { id: string; category?: string } =>
				Boolean(definition),
		);
		for (const definition of actionDefinitions) {
			const costs = harness.metadata.costMap.get(definition.id) ?? {};
			const failures =
				harness.metadata.requirementFailures.get(definition.id) ?? [];
			seedSessionActionMetadata(harness.sessionId, definition.id, {
				costs,
				requirements: failures,
				groups: [],
			});
		}
		if (summarizeSpy) {
			summarizeSpy.mockRestore();
		}
		const actualSummarize = translationModule.summarizeContent;
		summarizeSpy = vi
			.spyOn(translationModule, 'summarizeContent')
			.mockImplementation((type, id, context) => {
				if (type === 'action') {
					return ['Action summary'];
				}
				return actualSummarize(type, id, context);
			});
	});

	afterEach(() => {
		clearSessionActionMetadataStore();
		if (summarizeSpy) {
			summarizeSpy.mockRestore();
			summarizeSpy = null;
		}
	});

	const renderPanel = () => {
		return render(
			<RegistryMetadataProvider
				registries={harness.sessionRegistries}
				metadata={harness.sessionSnapshot.metadata}
			>
				<ActionsPanel />
			</RegistryMetadataProvider>,
		);
	};

	it('displays performable counts for each category', async () => {
		renderPanel();
		const tabs = await screen.findAllByRole('tab');
		expect(tabs.length).toBeGreaterThan(0);
		const actionDefinitions = Object.values(harness.metadata.actions).filter(
			(definition): definition is { id: string; system?: boolean } =>
				Boolean(definition) && !definition.system,
		);
		let totalSeen = 0;
		for (const tab of tabs) {
			const counter = within(tab).getByText(/\d+\/\d+/);
			const [performableText, totalText] =
				counter.textContent?.split('/') ?? [];
			const performable = Number(performableText);
			const total = Number(totalText);
			expect(Number.isFinite(total)).toBe(true);
			expect(Number.isFinite(performable)).toBe(true);
			expect(total).toBeGreaterThan(0);
			expect(performable).toBeGreaterThanOrEqual(0);
			expect(performable).toBeLessThanOrEqual(total);
			totalSeen += total;
		}
		expect(totalSeen).toBe(actionDefinitions.length);
	});

	it('moves subtitles into the active tab content when switching tabs', async () => {
		renderPanel();
		const tabs = await screen.findAllByRole('tab');
		expect(tabs.length).toBeGreaterThan(1);
		const categoryDefinitions =
			harness.translationContext.actionCategories.list();
		const definitionById = new Map(
			categoryDefinitions.map((definition) => [definition.id, definition]),
		);
		const actionDefinitions = Object.values(harness.metadata.actions).filter(
			(definition): definition is { id: string; category?: string } =>
				Boolean(definition),
		);
		const categoryIds = Array.from(
			new Set(
				actionDefinitions
					.map((definition) => definition.category)
					.filter((categoryId): categoryId is string => Boolean(categoryId)),
			),
		);
		const findTabForCategory = (categoryId: string) => {
			const definition = definitionById.get(categoryId);
			const title = definition?.title ?? categoryId;
			return tabs.find((tab) => {
				const label = tab.textContent ?? '';
				return new RegExp(title, 'i').test(label);
			});
		};
		const primaryCategoryId = categoryIds[0];
		const secondaryCategoryId = categoryIds.find(
			(categoryId) => categoryId !== primaryCategoryId,
		);
		if (!primaryCategoryId || !secondaryCategoryId) {
			throw new Error(
				'Expected multiple action categories for ActionsPanel test.',
			);
		}
		const primaryTab = findTabForCategory(primaryCategoryId);
		const secondaryTab = findTabForCategory(secondaryCategoryId);
		if (!primaryTab || !secondaryTab) {
			throw new Error('Unable to locate tabs for category subtitle test.');
		}
		const activeTab = tabs.find(
			(tab) => tab.getAttribute('aria-selected') === 'true',
		);
		if (!activeTab) {
			throw new Error('Expected an active tab when rendering ActionsPanel.');
		}
		const activePanelId = activeTab.getAttribute('aria-controls');
		if (!activePanelId) {
			throw new Error('Expected active tab to reference a tabpanel element.');
		}
		const tabPanel = document.getElementById(activePanelId);
		if (!tabPanel) {
			throw new Error(
				'Unable to locate tabpanel referenced by the active tab.',
			);
		}
		const primarySubtitleElement = within(tabPanel).getByText(/^\(.*\)$/);
		const primarySubtitle = primarySubtitleElement.textContent ?? '';
		expect(primarySubtitle.length).toBeGreaterThan(0);
		expect(
			within(primaryTab).queryByText(primarySubtitle, { exact: false }),
		).toBeNull();
		fireEvent.click(secondaryTab);
		await waitFor(() => {
			expect(secondaryTab).toHaveAttribute('aria-selected', 'true');
		});
		const updatedPanelId = secondaryTab.getAttribute('aria-controls');
		if (!updatedPanelId) {
			throw new Error('Expected secondary tab to reference a tabpanel.');
		}
		const updatedPanel = document.getElementById(updatedPanelId);
		if (!updatedPanel) {
			throw new Error('Unable to locate tabpanel referenced by secondary tab.');
		}
		const secondarySubtitleElement = within(updatedPanel).getByText(/^\(.*\)$/);
		const secondarySubtitle = secondarySubtitleElement.textContent ?? '';
		expect(secondarySubtitle.length).toBeGreaterThan(0);
		expect(
			within(secondaryTab).queryByText(secondarySubtitle, { exact: false }),
		).toBeNull();
		if (secondarySubtitle !== primarySubtitle) {
			expect(secondarySubtitle).not.toEqual(primarySubtitle);
		}
		expect(updatedPanel).toBe(tabPanel);
		expect(primaryTab).toHaveAttribute('aria-selected', 'false');
	});
});
