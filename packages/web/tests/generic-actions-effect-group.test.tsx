/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import GenericActions from '../src/components/actions/GenericActions';

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
const splitSummaryMock = vi.fn(() => ({ effects: [], description: undefined }));

vi.mock('../src/translation', () => ({
	describeContent: (...args: unknown[]) => describeContentMock(...args),
	summarizeContent: (...args: unknown[]) => summarizeContentMock(...args),
	splitSummary: (...args: unknown[]) => splitSummaryMock(...args),
}));

const actionsMap = new Map([
	[
		'royal_decree',
		{ id: 'royal_decree', name: 'Royal Decree', icon: '📜', focus: 'economy' },
	],
	['develop', { id: 'develop', name: 'Develop', icon: '🏗️' }],
	['till', { id: 'till', name: 'Till', icon: '🧑\u200d🌾' }],
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
		splitSummaryMock.mockReset();

		getActionCostsMock.mockImplementation(() => ({ ap: 1, gold: 12 }));
		getActionRequirementsMock.mockImplementation(() => []);
		getRequirementIconsMock.mockImplementation(() => []);
		getActionEffectGroupsMock.mockImplementation((actionId: string) => {
			if (actionId !== 'royal_decree') {
				return [];
			}
			return [
				{
					id: 'royal_decree_develop',
					title: 'Decree a development',
					summary: 'Pick a project to finish immediately.',
					description: 'Select which development to complete after expanding.',
					layout: 'compact',
					options: [
						{
							id: 'royal_decree_house',
							label: 'Raise a House',
							icon: '🏠',
							summary: 'Build a House on the new land.',
							description: 'Completes Develop with the House immediately.',
							actionId: 'develop',
							params: { landId: '$landId', id: 'house' },
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
			name: /Raise a House/,
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
