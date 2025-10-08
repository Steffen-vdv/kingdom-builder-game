/** @vitest-environment jsdom */
/* eslint-disable no-max-lines-override */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ActionId, Resource } from '@kingdom-builder/contents';
import type { EngineSessionSnapshot } from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import GenericActions from '../src/components/actions/GenericActions';
import type * as TranslationModule from '../src/translation';
import type * as TranslationContentModule from '../src/translation/content';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from './helpers/translationContextStub';
import { selectSessionView } from '../src/state/sessionSelectors';
import type { SessionRegistries } from '../src/state/sessionContent';
import { createActionsPanelState } from './helpers/createActionsPanelState';
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
		ActionId.royal_decree,
		{
			id: ActionId.royal_decree,
			name: 'Royal Decree',
			icon: '📜',
			focus: 'economy' as const,
		},
	],
	[ActionId.develop, { id: ActionId.develop, name: 'Develop', icon: '🏗️' }],
	[ActionId.till, { id: ActionId.till, name: 'Till', icon: '🧑\u200d🌾' }],
] as const);

function createMockGame() {
	const actionCostResource = 'ap';
	const activePlayer = {
		id: 'A',
		name: 'Player',
		resources: { ap: 3, gold: 20 },
		lands: [{ id: 'A-L1', slotsFree: 0 }],
		population: {} as Record<string, number>,
		buildings: new Set<string>(),
		actions: new Set<string>(Array.from(actionsMap.keys())),
	};
	const opponent = {
		id: 'B',
		name: 'Opponent',
		resources: { ap: 0, gold: 0 },
		lands: [],
		population: {} as Record<string, number>,
		buildings: new Set<string>(),
		actions: new Set<string>(),
	};
	const translationContext = createTranslationContextStub({
		actions: wrapTranslationRegistry({
			get(id: string) {
				const action = actionsMap.get(id as ActionId);
				if (!action) {
					throw new Error(`Unknown action ${id}`);
				}
				return action;
			},
			has(id: string) {
				return actionsMap.has(id as ActionId);
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
		phases: [{ id: 'main' }],
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
	});

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
			currentPhase: 'main',
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
				id: 'main',
				name: 'Main',
				action: true,
				steps: [],
			},
		],
		actionCostResource,
		recentResourceGains: [],
		compensations: {} as Record<string, PlayerStartConfig>,
		rules: {
			tieredResourceKey: Resource.happiness,
			tierDefinitions: [],
			winConditions: [],
		},
		passiveRecords: {
			[activePlayer.id]: [],
			[opponent.id]: [],
		},
	};

	const emptyRegistry = new Map<string, never>();
	const sessionRegistries: SessionRegistries = {
		actions: {
			entries: () => Array.from(actionsMap.entries()),
			get(id: string) {
				const action = actionsMap.get(id as ActionId);
				if (!action) {
					throw new Error(`Unknown action ${id}`);
				}
				return action;
			},
			has(id: string) {
				return actionsMap.has(id as ActionId);
			},
		},
		buildings: {
			entries: () => Array.from(emptyRegistry.entries()),
			get(id: string) {
				throw new Error(`No building ${id}`);
			},
			has() {
				return false;
			},
		},
		developments: {
			entries: () => Array.from(emptyRegistry.entries()),
			get(id: string) {
				throw new Error(`No development ${id}`);
			},
			has() {
				return false;
			},
		},
	};

	const sessionView = selectSessionView(sessionState, sessionRegistries);

	const session = {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	} as const;

	return {
		...createActionsPanelState(actionCostResource),
		logOverflowed: false,
		session,
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot: sessionState.rules,
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
			ap: 1,
			gold: 12,
		}));
		mockGame.session.getActionRequirements.mockImplementation(() => []);
		getRequirementIconsMock.mockImplementation(() => []);
		summarizeContentMock.mockImplementation((type: unknown, id: unknown) => {
			if (type === 'action' && id === ActionId.develop) {
				return ['🏠 House'];
			}
			return [];
		});
		mockGame.session.getActionOptions.mockImplementation((actionId: string) => {
			if (actionId !== ActionId.royal_decree) {
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
							actionId: ActionId.develop,
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
			id: ActionId.royal_decree,
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
			<GenericActions
				actions={[action]}
				summaries={new Map([[action.id, ['Expand swiftly']]])}
				player={activePlayer}
				canInteract={true}
			/>,
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
