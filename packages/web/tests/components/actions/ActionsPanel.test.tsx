/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ActionsPanel from '../../../src/components/actions/ActionsPanel';
import { RegistryMetadataProvider } from '../../../src/contexts/RegistryMetadataContext';
import { createActionsPanelGame } from '../../helpers/actionsPanel';
import {
	clearSessionActionMetadataStore,
	seedSessionActionMetadata,
} from '../../helpers/mockSessionActionMetadataStore';
import type { ActionsPanelTestHarness } from '../../helpers/actionsPanel.types';
import * as Translation from '../../../src/translation';
import { clearSessionStateStore } from '../../../src/state/sessionStateStore';
import { setGameApi } from '../../../src/state/gameApiInstance';
import { createGameApiMock } from '../../../src/services/gameApi.mocks';

let mockGame: ActionsPanelTestHarness;

const UNMET_REQUIREMENT = {
	requirement: {
		type: 'resource',
		method: 'spend',
		params: { resource: 'unobtainable', amount: 99 },
	},
} as const;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

describe('ActionsPanel tabs', () => {
	beforeEach(() => {
		clearSessionActionMetadataStore();
		clearSessionStateStore();
		mockGame = createActionsPanelGame({ showBuilding: true });
		vi.spyOn(Translation, 'summarizeContent').mockImplementation((type, id) => [
			`${String(type)}:${String(id)}`,
		]);
		vi.spyOn(Translation, 'describeContent').mockImplementation(() => []);
		seedInitialMetadata();
		setGameApi(createMockGameApi(mockGame));
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		setGameApi(null);
	});

	it('shows performable counters and updates when availability changes', async () => {
		renderPanel();
		const raiseCategoryId = mockGame.metadata.actions.raise.category;
		const basicCategoryId = mockGame.metadata.actions.basic.category;
		const raiseTab = await findTabButton(raiseCategoryId);
		const basicTab = await findTabButton(basicCategoryId);
		expect(
			within(raiseTab).getByLabelText('0 of 1 actions performable'),
		).toBeInTheDocument();
		expect(
			within(basicTab).getByLabelText('0 of 1 actions performable'),
		).toBeInTheDocument();
		const buildAction = mockGame.metadata.actions.building;
		if (buildAction) {
			const buildTab = await findTabButton(buildAction.category);
			expect(
				within(buildTab).getByLabelText('0 of 1 actions performable'),
			).toBeInTheDocument();
		}
		act(() => {
			seedSessionActionMetadata(
				mockGame.sessionId,
				mockGame.metadata.actions.basic.id,
				{
					costs:
						mockGame.metadata.costMap.get(mockGame.metadata.actions.basic.id) ??
						{},
					requirements: [],
					groups: [],
				},
			);
		});
		await within(basicTab).findByLabelText('1 of 1 actions performable');
	});

	it('supports navigation between category tabs', async () => {
		renderPanel();
		const raiseTab = await findTabButton(
			mockGame.metadata.actions.raise.category,
		);
		const basicTab = await findTabButton(
			mockGame.metadata.actions.basic.category,
		);
		fireEvent.click(basicTab);
		const panel = getTabPanel();
		expect(basicTab).toHaveAttribute('aria-selected', 'true');
		expect(panel).toBeInTheDocument();
		fireEvent.click(raiseTab);
		expect(raiseTab).toHaveAttribute('aria-selected', 'true');
	});

	it('renders generic action cards for each action entry', async () => {
		renderPanel();
		const basicTab = await findTabButton(
			mockGame.metadata.actions.basic.category,
		);
		fireEvent.click(basicTab);
		const panel = getTabPanel();
		expect(
			within(panel).getByRole('button', { name: /Survey/i }),
		).toBeInTheDocument();
		const raiseTab = await findTabButton(
			mockGame.metadata.actions.raise.category,
		);
		fireEvent.click(raiseTab);
		const raisePanel = getTabPanel();
		expect(
			within(raisePanel).getByRole('button', { name: /Hire/i }),
		).toBeInTheDocument();
		const buildAction = mockGame.metadata.actions.building;
		if (buildAction) {
			const buildTab = await findTabButton(buildAction.category);
			fireEvent.click(buildTab);
			const buildPanel = getTabPanel();
			expect(
				within(buildPanel).getByRole('button', { name: /Construct/i }),
			).toBeInTheDocument();
		}
	});

	it('renders tablist only when multiple categories are visible', async () => {
		// With showBuilding: true (set in beforeEach), we have 3 categories
		// (basic, hire, build), so tablist should be rendered
		renderPanel();
		// Wait for tablist to appear (use findAllByRole for async waiting)
		const tablists = await screen.findAllByRole('tablist');
		// Take the last one (most recent render)
		const tablist = tablists[tablists.length - 1];
		expect(tablist).toBeInTheDocument();
		// Count visible tabs - should have multiple (one per category with actions)
		const tabs = within(tablist).getAllByRole('tab');
		expect(tabs.length).toBeGreaterThan(1);
		// Tabpanel should also exist
		const tabpanels = screen.getAllByRole('tabpanel');
		expect(tabpanels.length).toBeGreaterThan(0);
	});

	it('hides tablist when only a single category is visible', () => {
		// Override the translation context to return only one category
		const basicCategoryId = mockGame.metadata.actions.basic.category;
		const originalList = mockGame.translationContext.actionCategories.list();
		const singleCategory = originalList.filter(
			(category) => category.id === basicCategoryId,
		);
		const originalRegistry = mockGame.translationContext.actionCategories;
		// Replace actionCategories with a mock that returns only one category
		(
			mockGame.translationContext as { actionCategories: unknown }
		).actionCategories = {
			...originalRegistry,
			list: () => singleCategory,
		};
		renderPanel();
		// With only one category, tablist should NOT be rendered
		const tablist = screen.queryByRole('tablist');
		expect(tablist).not.toBeInTheDocument();
		// But the tabpanel content should still be visible
		const tabpanel = screen.getByRole('tabpanel');
		expect(tabpanel).toBeInTheDocument();
	});
});

function renderPanel() {
	render(
		<RegistryMetadataProvider
			registries={mockGame.sessionRegistries}
			metadata={mockGame.sessionSnapshot.metadata}
		>
			<ActionsPanel />
		</RegistryMetadataProvider>,
	);
}

function seedInitialMetadata() {
	const {
		sessionId,
		metadata: { actions, costMap, requirementFailures },
	} = mockGame;
	seedSessionActionMetadata(sessionId, actions.raise.id, {
		costs: costMap.get(actions.raise.id) ?? {},
		requirements: requirementFailures.get(actions.raise.id) ?? [],
		groups: [],
	});
	seedSessionActionMetadata(sessionId, actions.basic.id, {
		costs: costMap.get(actions.basic.id) ?? {},
		requirements: [UNMET_REQUIREMENT],
		groups: [],
	});
	if (actions.building) {
		seedSessionActionMetadata(sessionId, actions.building.id, {
			costs: costMap.get(actions.building.id) ?? {},
			requirements: requirementFailures.get(actions.building.id) ?? [],
			groups: [],
		});
	}
}

async function findTabButton(categoryId: string) {
	await screen.findAllByRole('tablist');
	const element = document.getElementById(
		`actions-panel-tab-${categoryId}`,
	) as HTMLButtonElement | null;
	if (!element) {
		throw new Error(`Missing tab button for category ${categoryId}`);
	}
	return element;
}

function getTabPanel() {
	const element = document.getElementById('actions-panel-tabpanel');
	if (!element) {
		throw new Error('Missing actions panel tabpanel');
	}
	return element;
}

function createMockGameApi(harness: ActionsPanelTestHarness) {
	const { metadata, sessionSnapshot, sessionRegistries } = harness;
	const { costMap, requirementFailures } = metadata;
	return createGameApiMock({
		getActionCosts: (request) =>
			Promise.resolve({
				sessionId: request.sessionId,
				actionId: request.actionId,
				costs: costMap.get(request.actionId) ?? {},
			}),
		getActionRequirements: (request) =>
			Promise.resolve({
				sessionId: request.sessionId,
				actionId: request.actionId,
				requirements: requirementFailures.get(request.actionId) ?? [],
			}),
		getActionOptions: (request) =>
			Promise.resolve({
				sessionId: request.sessionId,
				actionId: request.actionId,
				groups: [],
			}),
		fetchSnapshot: (sessionId) =>
			Promise.resolve({
				sessionId,
				snapshot: sessionSnapshot,
				registries: toRegistriesPayload(sessionRegistries),
			}),
		fetchMetadataSnapshot: () =>
			Promise.resolve({
				metadata: sessionSnapshot.metadata,
			}),
	});
}

function toRegistriesPayload(
	registries: ActionsPanelTestHarness['sessionRegistries'],
) {
	return {
		actions: Object.fromEntries(registries.actions.entries()),
		actionCategories: Object.fromEntries(registries.actionCategories.entries()),
		buildings: Object.fromEntries(registries.buildings.entries()),
		developments: Object.fromEntries(registries.developments.entries()),
		populations: Object.fromEntries(registries.populations.entries()),
		resources: { ...registries.resources },
	};
}
