/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ActionsPanel from '../src/components/actions/ActionsPanel';
import {
	createActionsPanelGame,
	type ActionsPanelGameOptions,
} from './helpers/actionsPanel';

const actionCostsMock = vi.fn();
const actionRequirementsMock = vi.fn();
const requirementIconsMock = vi.fn();

vi.mock('@kingdom-builder/engine', () => ({
	getActionCosts: (...args: unknown[]) => actionCostsMock(...args),
	getActionRequirements: (...args: unknown[]) =>
		actionRequirementsMock(...args),
	getActionEffectGroups: () => [],
}));

vi.mock('../src/utils/getRequirementIcons', () => ({
	getRequirementIcons: (...args: unknown[]) => requirementIconsMock(...args),
}));

vi.mock('../src/translation', () => ({
	describeContent: vi.fn(() => []),
	summarizeContent: vi.fn(() => []),
	splitSummary: vi.fn((summary: unknown) => ({
		effects: Array.isArray(summary) ? summary : [],
		description: undefined,
	})),
}));

let mockGame = createActionsPanelGame();
let metadata = mockGame.metadata;

function setScenario(options?: ActionsPanelGameOptions) {
	mockGame = createActionsPanelGame(options);
	metadata = mockGame.metadata;
	actionCostsMock.mockImplementation((actionId: string) => {
		return metadata.costMap.get(actionId) ?? {};
	});
	actionRequirementsMock.mockImplementation((actionId: string) => {
		return metadata.requirementMessages.get(actionId) ?? [];
	});
	requirementIconsMock.mockImplementation((actionId: string) => {
		return metadata.requirementIcons.get(actionId) ?? [];
	});
}

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	actionCostsMock.mockReset();
	actionRequirementsMock.mockReset();
	requirementIconsMock.mockReset();
	setScenario();
});

describe('<ActionsPanel />', () => {
	it(
		'renders hire options for generated population roles ' +
			'with derived requirement icons',
		() => {
			render(<ActionsPanel />);
			const raiseAction = metadata.actions.raise;
			expect(requirementIconsMock).toHaveBeenCalledWith(
				raiseAction.id,
				expect.anything(),
			);
			const baseIcons = metadata.requirementIcons.get(raiseAction.id) ?? [];
			const hireButtons = screen.getAllByRole('button', {
				name: /Hire\s*:/,
			});
			const requirementTexts = hireButtons.map(
				(button) => within(button).getByText(/^Req/).textContent ?? '',
			);
			for (const role of metadata.populationRoles) {
				expect(
					requirementTexts.some((text) => {
						if (!text.includes('Req')) {
							return false;
						}
						if (baseIcons.some((icon) => !text.includes(icon))) {
							return false;
						}
						if (
							metadata.populationInfoIcon &&
							!text.includes(metadata.populationInfoIcon)
						) {
							return false;
						}
						return role.icon ? text.includes(role.icon) : true;
					}),
				).toBe(true);
			}
			expect(hireButtons).toHaveLength(metadata.populationRoles.length);
		},
	);

	it('falls back to requirement helper icons for building cards', () => {
		setScenario({ showBuilding: true });
		render(<ActionsPanel />);
		const buildingAction = metadata.actions.building;
		if (!buildingAction) {
			throw new Error('Expected building action to be defined');
		}
		expect(requirementIconsMock).toHaveBeenCalledWith(
			buildingAction.id,
			expect.anything(),
		);
		const icons = metadata.requirementIcons.get(buildingAction.id) ?? [];
		const buildingDefinition = metadata.building;
		if (!buildingDefinition) {
			throw new Error('Expected building definition to exist');
		}
		const buildingButton = screen.getByRole('button', {
			name: new RegExp(buildingDefinition.name),
		});
		const requirementText =
			within(buildingButton).getByText(/^Req/).textContent ?? '';
		const allIconsPresent = icons.every((icon) => {
			return requirementText.includes(icon);
		});
		expect(allIconsPresent).toBe(true);
	});

	it(
		'omits the hire section when the helper supplies a non-population ' +
			'action category',
		() => {
			setScenario({
				actionCategories: { population: 'custom-population' },
			});
			expect(metadata.actions.raise.category).toBe('custom-population');
			render(<ActionsPanel />);
			expect(
				screen.queryAllByRole('button', { name: /Hire\s*:/ }),
			).toHaveLength(0);
		},
	);

	it('renders requirement icons for custom generated population roles', () => {
		setScenario({
			populationRoles: [
				{
					name: 'Mystic',
					icon: '🔮',
					upkeep: { [metadata.upkeepResource]: 2 },
					onAssigned: [{}],
				},
			],
			statKeys: { capacity: `${metadata.capacityStat}-alt` },
		});
		render(<ActionsPanel />);
		const hireButtons = screen.getAllByRole('button', {
			name: /Hire\s*:/,
		});
		const requirementTexts = hireButtons.map(
			(button) => within(button).getByText(/^Req/).textContent ?? '',
		);
		const roleIcon = metadata.populationRoles[0]?.icon ?? '';
		expect(
			requirementTexts.some((text) => {
				if (
					metadata.populationInfoIcon &&
					!text.includes(metadata.populationInfoIcon)
				) {
					return false;
				}
				if (roleIcon && !text.includes(roleIcon)) {
					return false;
				}
				return true;
			}),
		).toBe(true);
		expect(hireButtons).toHaveLength(1);
	});
});
