/** @vitest-environment jsdom */
/* eslint-disable max-lines */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import GenericActions from '../src/components/actions/GenericActions';
import type * as TranslationModule from '../src/translation';
import type * as TranslationContentModule from '../src/translation/content';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createActionsPanelState } from './helpers/createActionsPanelState';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context/createTranslationContext';
import type { PhaseConfig, RuleSet } from '@kingdom-builder/protocol';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
const getRequirementIconsMock = vi.fn();
vi.mock('../src/utils/getRequirementIcons', () => ({
	getRequirementIcons: (...args: unknown[]) => getRequirementIconsMock(...args),
}));
const describeContentMock = vi.fn(() => []);
const summarizeContentMock = vi.fn(() => []);
const logContentMock = vi.fn(() => []);
const splitSummaryMock = vi.fn(() => ({ effects: [], description: undefined }));

vi.mock('../src/translation', async () => {
	const actual = (await vi.importActual(
		'../src/translation',
	)) as TranslationModule;
	return {
		...actual,
		registerEffectFormatter: vi.fn(),
		registerEvaluatorFormatter: vi.fn(),
		describeContent: (...args: unknown[]) => describeContentMock(...args),
		summarizeContent: (...args: unknown[]) => summarizeContentMock(...args),
		splitSummary: (...args: unknown[]) => splitSummaryMock(...args),
	};
});

vi.mock('../src/translation/content', async () => {
	const actual = (await vi.importActual(
		'../src/translation/content',
	)) as TranslationContentModule;
	return {
		...actual,
		describeContent: (...args: unknown[]) => describeContentMock(...args),
		summarizeContent: (...args: unknown[]) => summarizeContentMock(...args),
		logContent: (...args: unknown[]) => logContentMock(...args),
	};
});

const actionsMap = new Map([
	[
		'royal_decree',
		{
			id: 'royal_decree',
			name: 'Royal Decree',
			icon: '📜',
			focus: 'economy' as const,
		},
	],
	['develop', { id: 'develop', name: 'Develop', icon: '🏗️' }],
	['till', { id: 'till', name: 'Till', icon: '🧑\u200d🌾' }],
] as const);

function createMockGame() {
	const baseRegistries = createSessionRegistries();
	const resourceKeys = Object.keys(baseRegistries.resources);
	const actionCostResource = resourceKeys[0] ?? 'resource-action';
	const secondaryResource = resourceKeys[1] ?? actionCostResource;
	const tieredResourceKey = resourceKeys[2] ?? secondaryResource;
	const actionPhaseId = 'phase.action';
	const phases: PhaseConfig[] = [
		{ id: actionPhaseId, label: 'Action', action: true, steps: [] },
	];
	const ruleSnapshot: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'nearest',
		tieredResourceKey,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: [],
	};
	const actions = Array.from(actionsMap.values()).map((action) => action.id);
	const activePlayer = createSnapshotPlayer({
		id: 'A',
		name: 'Player',
		resources: {
			[actionCostResource]: 3,
			[secondaryResource]: 20,
		},
		lands: [
			{
				id: 'A-L1',
				slotsMax: 1,
				slotsUsed: 1,
				tilled: false,
				developments: [],
				slots: [],
			},
		],
		actions,
	});
	const opponent = createSnapshotPlayer({
		id: 'B',
		name: 'Opponent',
		resources: {
			[actionCostResource]: 0,
			[secondaryResource]: 0,
		},
		actions: [],
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases,
		actionCostResource,
		ruleSnapshot,
	});
	const resourceDescriptors = Object.fromEntries(
		Object.entries(baseRegistries.resources).map(([key, definition]) => [
			key,
			{
				id: key,
				label: definition.label ?? key,
				icon: definition.icon,
			},
		]),
	);
	sessionState.metadata = {
		passiveEvaluationModifiers: {},
		resources: resourceDescriptors,
	};
	const translationContext = createTranslationContext(
		sessionState,
		baseRegistries,
		sessionState.metadata,
		{
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		{
			resources: baseRegistries.resources,
			populations: baseRegistries.populations,
			buildings: baseRegistries.buildings,
			developments: baseRegistries.developments,
		},
		sessionState.metadata,
	);

	const sessionRegistries = baseRegistries;

	const sessionView = selectSessionView(sessionState, sessionRegistries);

	const session = {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	} as const;

	return {
		...createActionsPanelState({
			actionCostResource,
			phaseId: actionPhaseId,
		}),
		logOverflowed: false,
		session,
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot: sessionState.rules,
		sessionRegistries,
		actionCostResource,
		secondaryResource,
		metadataSelectors,
	};
}
let mockGame: ReturnType<typeof createMockGame>;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

describe('GenericActions effect group handling', () => {
	beforeEach(() => {
		mockGame = createMockGame();
		mockGame.session.getActionCosts.mockReset();
		mockGame.session.getActionRequirements.mockReset();
		mockGame.session.getActionOptions.mockReset();
		getRequirementIconsMock.mockReset();
		describeContentMock.mockReset();
		summarizeContentMock.mockReset();
		logContentMock.mockReset();
		splitSummaryMock.mockReset();

		mockGame.session.getActionCosts.mockImplementation(() => ({
			[mockGame.actionCostResource]: 1,
			[mockGame.secondaryResource]: 12,
		}));
		mockGame.session.getActionRequirements.mockImplementation(() => []);
		getRequirementIconsMock.mockImplementation(() => []);
		summarizeContentMock.mockImplementation((type: unknown, id: unknown) => {
			if (type === 'action' && id === 'develop') {
				return ['🏠 House'];
			}
			return [];
		});
		mockGame.session.getActionOptions.mockImplementation((actionId: string) => {
			if (actionId !== 'royal_decree') {
				return [];
			}
			return [
				{
					id: 'royal_decree_develop',
					title: 'Choose one:',
					layout: 'compact',
					options: [
						{
							id: 'royal_decree_house',
							icon: '🏠',
							actionId: 'develop',
							params: {
								landId: '$landId',
								developmentId: 'house',
							},
						},
					],
				},
			];
		});
	});

	it('collects choices and parameters before performing royal decree', async () => {
		const action = {
			id: 'royal_decree',
			name: 'Royal Decree',
			icon: '📜',
			category: 'basic',
			order: 5,
			focus: 'economy' as const,
		};
		const activePlayer = mockGame.sessionView.active;
		if (!activePlayer) {
			throw new Error('Expected active player for generic actions test');
		}
		render(
			<RegistryMetadataProvider
				registries={mockGame.sessionRegistries}
				metadata={mockGame.sessionState.metadata}
			>
				<GenericActions
					actions={[action]}
					summaries={new Map([[action.id, ['Expand swiftly']]])}
					player={activePlayer}
					canInteract={true}
					selectResourceDescriptor={(resourceKey) =>
						mockGame.metadataSelectors.resourceMetadata(resourceKey) ?? {
							id: resourceKey,
							label: resourceKey,
							icon: mockGame.sessionRegistries.resources[resourceKey]?.icon,
						}
					}
				/>
			</RegistryMetadataProvider>,
		);

		const actionButton = screen.getByRole('button', { name: /Royal Decree/ });
		fireEvent.click(actionButton);

		const optionButton = await screen.findByRole('button', {
			name: /🏗️ Develop - 🏠 House/,
		});
		fireEvent.click(optionButton);

		await waitFor(() => {
			expect(mockGame.handlePerform).toHaveBeenCalledTimes(1);
		});
		const [, params] = mockGame.handlePerform.mock.calls[0]!;
		expect(params).toMatchObject({
			landId: 'A-L2',
			choices: {
				royal_decree_develop: { optionId: 'royal_decree_house' },
			},
		});
	});
});
