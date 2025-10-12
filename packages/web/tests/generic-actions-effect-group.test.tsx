/** @vitest-environment jsdom */
/* eslint-disable max-lines */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { EngineSessionSnapshot } from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import GenericActions from '../src/components/actions/GenericActions';
import type * as TranslationModule from '../src/translation';
import type * as TranslationContentModule from '../src/translation/content';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from './helpers/translationContextStub';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createActionsPanelState } from './helpers/createActionsPanelState';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import { createRegistry } from './helpers/createRegistry';
import { createTranslationAssets } from '../src/translation/context/assets';
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

function createMockGame() {
	const factory = createContentFactory();
	const sessionRegistries = createSessionRegistries();
	const resourceKeyList = Object.keys(sessionRegistries.resources);
	const actionCostResource = resourceKeyList[0] ?? 'resource:action-cost';
	const reserveResource =
		resourceKeyList.find((key) => key !== actionCostResource) ??
		actionCostResource;

	const royalDecree = factory.action({
		name: 'Royal Decree',
		icon: '📜',
	});
	const developAction = factory.action({
		name: 'Develop',
		icon: '🏗️',
	});
	const tillAction = factory.action({
		name: 'Till',
		icon: '🧑\u200d🌾',
	});
	Object.assign(royalDecree, { focus: 'economy' as const });
	Object.assign(developAction, { focus: 'other' as const });
	Object.assign(tillAction, { focus: 'other' as const });

	const actions = [royalDecree, developAction, tillAction];
	const actionsRegistry = createRegistry(actions);
	const actionsMap = new Map(actions.map((action) => [action.id, action]));

	const mainPhaseId = `${royalDecree.id}:phase`;

	const activePlayer = {
		id: 'A',
		name: 'Player',
		resources: { [actionCostResource]: 3, [reserveResource]: 20 },
		lands: [
			{ id: 'A-L1', slotsFree: 0 },
			{ id: 'A-L2', slotsFree: 0 },
			{ id: 'A-L3', slotsFree: 1 },
		],
		population: {} as Record<string, number>,
		buildings: new Set<string>(),
		actions: new Set<string>(actions.map((action) => action.id)),
	};
	const opponent = {
		id: 'B',
		name: 'Opponent',
		resources: { [actionCostResource]: 0, [reserveResource]: 0 },
		lands: [],
		population: {} as Record<string, number>,
		buildings: new Set<string>(),
		actions: new Set<string>(),
	};

	const rules = {
		tieredResourceKey: reserveResource,
		tierDefinitions: [],
		winConditions: [],
	} as const;

	const toSnapshot = (participant: typeof activePlayer) => ({
		id: participant.id,
		name: participant.name,
		resources: { ...participant.resources },
		stats: {},
		statsHistory: {},
		population: { ...participant.population },
		lands: participant.lands.map((land) => ({
			id: land.id,
			slotsMax: land.slotsFree,
			slotsUsed: 0,
			tilled: false,
			developments: [],
		})),
		buildings: Array.from(participant.buildings),
		actions: Array.from(participant.actions),
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	});

	const sessionState: EngineSessionSnapshot = {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: mainPhaseId,
			currentStep: '',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players: [toSnapshot(activePlayer), toSnapshot(opponent)],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
		},
		phases: [
			{
				id: mainPhaseId,
				name: 'Main',
				action: true,
				steps: [],
			},
		],
		actionCostResource,
		recentResourceGains: [],
		compensations: {} as Record<string, PlayerStartConfig>,
		rules,
		passiveRecords: {
			[activePlayer.id]: [],
			[opponent.id]: [],
		},
		metadata: { passiveEvaluationModifiers: {} },
	};

	const emptyRegistry = createRegistry<{ id: string }>([]);
	sessionRegistries.actions = actionsRegistry;
	sessionRegistries.buildings = emptyRegistry;
	sessionRegistries.developments = emptyRegistry;

	const sessionView = selectSessionView(sessionState, sessionRegistries);

	const resourceDescriptors = Object.fromEntries(
		Object.entries(sessionRegistries.resources).map(([key, definition]) => [
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

	const translationAssets = createTranslationAssets(
		sessionRegistries,
		sessionState.metadata,
		{ rules },
	);

	const translationContext = createTranslationContextStub({
		actions: wrapTranslationRegistry({
			get(id: string) {
				const action = actionsMap.get(id);
				if (!action) {
					throw new Error(`Unknown action ${id}`);
				}
				return action;
			},
			has(id: string) {
				return actionsMap.has(id);
			},
		}),
		buildings: wrapTranslationRegistry({
			get(id: string) {
				throw new Error(`No building ${id}`);
			},
			has() {
				return false;
			},
		}),
		developments: wrapTranslationRegistry({
			get(id: string) {
				throw new Error(`No development ${id}`);
			},
			has() {
				return false;
			},
		}),
		populations: wrapTranslationRegistry(sessionRegistries.populations),
		phases: [{ id: mainPhaseId }],
		activePlayer: toTranslationPlayer({
			id: activePlayer.id,
			name: activePlayer.name,
			resources: activePlayer.resources,
			population: activePlayer.population,
		}),
		opponent: toTranslationPlayer({
			id: opponent.id,
			name: opponent.name,
			resources: opponent.resources,
			population: opponent.population,
		}),
		actionCostResource,
		rules,
		assets: translationAssets,
	});

	const session = {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	} as const;

	return {
		...createActionsPanelState(actionCostResource, mainPhaseId),
		logOverflowed: false,
		session,
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot: sessionState.rules,
		sessionRegistries,
		actions: {
			royalDecree,
			develop: developAction,
			till: tillAction,
		},
		resources: {
			actionCost: actionCostResource,
			reserve: reserveResource,
		},
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
			[mockGame.resources.actionCost]: 1,
			[mockGame.resources.reserve]: 12,
		}));
		mockGame.session.getActionRequirements.mockImplementation(() => []);
		getRequirementIconsMock.mockImplementation(() => []);
		summarizeContentMock.mockImplementation((type: unknown, id: unknown) => {
			if (type === 'action' && id === mockGame.actions.develop.id) {
				return ['🏠 House'];
			}
			return [];
		});
		mockGame.session.getActionOptions.mockImplementation((actionId: string) => {
			if (actionId !== mockGame.actions.royalDecree.id) {
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
							actionId: mockGame.actions.develop.id,
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
			id: mockGame.actions.royalDecree.id,
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
						mockGame.sessionState.metadata.resources?.[resourceKey] ?? {
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
			choices: {
				royal_decree_develop: { optionId: 'royal_decree_house' },
			},
		});
		expect(params?.landId).toMatch(/^A-L\d+$/);
	});
});
