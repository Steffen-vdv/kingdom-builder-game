/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ActionId } from '@kingdom-builder/contents';
import GenericActions from '../src/components/actions/GenericActions';
import type * as TranslationModule from '../src/translation';
import type * as TranslationContentModule from '../src/translation/content';

const getActionCostsMock = vi.fn();
const getActionRequirementsMock = vi.fn();
const getActionEffectGroupsMock = vi.fn();

vi.mock('@kingdom-builder/engine', () => ({
	getActionCosts: (...args: unknown[]) => getActionCostsMock(...args),
	getActionRequirements: (...args: unknown[]) =>
		getActionRequirementsMock(...args),
	getActionEffectGroups: (...args: unknown[]) =>
		getActionEffectGroupsMock(...args),
}));

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
	const activePlayer = {
		id: 'A',
		name: 'Player',
		resources: { ap: 3, gold: 20 },
		lands: [{ id: 'A-L1', slotsFree: 0 }],
		population: {} as Record<string, number>,
		buildings: new Set<string>(),
		actions: new Set<string>(Array.from(actionsMap.keys())),
	};
	return {
		ctx: {
			actions: {
				get(id: string) {
					const action = actionsMap.get(id);
					if (!action) {
						throw new Error(`Unknown action ${id}`);
					}
					return action;
				},
				map: actionsMap,
			},
			activePlayer,
			actionCostResource: 'ap',
		},
		handlePerform: vi.fn().mockResolvedValue(undefined),
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		actionCostResource: 'ap',
	};
}

let mockGame: ReturnType<typeof createMockGame>;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

describe('GenericActions effect group handling', () => {
	beforeEach(() => {
		mockGame = createMockGame();
		getActionCostsMock.mockReset();
		getActionRequirementsMock.mockReset();
		getActionEffectGroupsMock.mockReset();
		getRequirementIconsMock.mockReset();
		describeContentMock.mockReset();
		summarizeContentMock.mockReset();
		logContentMock.mockReset();
		splitSummaryMock.mockReset();

		getActionCostsMock.mockImplementation(() => ({ ap: 1, gold: 12 }));
		getActionRequirementsMock.mockImplementation(() => []);
		getRequirementIconsMock.mockImplementation(() => []);
		summarizeContentMock.mockImplementation((type: unknown, id: unknown) => {
			if (type === 'action' && id === ActionId.develop) {
				return ['🏠 House'];
			}
			return [];
		});
		getActionEffectGroupsMock.mockImplementation((actionId: string) => {
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
		render(
			<GenericActions
				actions={[action]}
				summaries={new Map([[action.id, ['Expand swiftly']]])}
				player={mockGame.ctx.activePlayer as never}
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
