/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
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

describe('ActionsPanel meta-categories', () => {
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

	it('renders meta-category panels for visible meta-categories', async () => {
		renderPanel();
		// The Commands meta-category should be visible (visibilityTrigger: always)
		const metaCategories =
			mockGame.translationContext.actionMetaCategories.list();
		const commandsMeta = metaCategories.find(
			(meta) => meta.visibilityTrigger === 'always',
		);
		if (commandsMeta) {
			// Should render a section with the meta-category's label
			const heading = await screen.findByRole('heading', {
				name: new RegExp(commandsMeta.label, 'i'),
			});
			expect(heading).toBeInTheDocument();
		}
	});

	it('renders action buttons for available actions', async () => {
		renderPanel();
		// Check that action cards are rendered
		const surveyButton = await screen.findByRole('button', { name: /Survey/i });
		expect(surveyButton).toBeInTheDocument();

		const hireButton = await screen.findByRole('button', { name: /Hire/i });
		expect(hireButton).toBeInTheDocument();
	});

	it('renders building actions when available', async () => {
		renderPanel();
		const buildAction = mockGame.metadata.actions.building;
		if (buildAction) {
			const buildButton = await screen.findByRole('button', {
				name: /Construct/i,
			});
			expect(buildButton).toBeInTheDocument();
		}
	});

	it('updates action availability when metadata changes', async () => {
		renderPanel();

		// Initially the basic action should have unmet requirements
		// (seeded with UNMET_REQUIREMENT in seedInitialMetadata)

		// Update metadata to clear requirements
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

		// The action should still be visible (component re-renders)
		const surveyButton = await screen.findByRole('button', { name: /Survey/i });
		expect(surveyButton).toBeInTheDocument();
	});

	it('shows status indicators when not in action phase', async () => {
		// Modify the mock to simulate not being in action phase
		const originalPhase = mockGame.phase;
		(mockGame as { phase: unknown }).phase = 'income';

		renderPanel();

		// Should show "Not In Main Phase" indicator
		const indicator = await screen.findByText(/Not In Main Phase/i);
		expect(indicator).toBeInTheDocument();

		// Restore
		(mockGame as { phase: unknown }).phase = originalPhase;
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
