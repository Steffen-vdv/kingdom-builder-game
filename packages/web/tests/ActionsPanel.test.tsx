/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ActionsPanel from '../src/components/actions/ActionsPanel';
import { translateRequirementFailure } from '../src/translation';
import { createActionsPanelGame } from './helpers/actionsPanel';
import type { ActionsPanelGameOptions } from './helpers/actionsPanel.types';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';

const requirementIconsMock = vi.fn();

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
	translateRequirementFailure: vi.fn(
		(failure: { requirement: { method?: string } }) =>
			`translated:${failure.requirement.method ?? 'unknown'}`,
	),
}));

const translateRequirementFailureMock = vi.mocked(translateRequirementFailure);

let mockGame = createActionsPanelGame();
let metadata = mockGame.metadata;
function setScenario(options?: ActionsPanelGameOptions) {
	mockGame = createActionsPanelGame(options);
	metadata = mockGame.metadata;
	requirementIconsMock.mockImplementation((actionId: string) => {
		return metadata.requirementIcons.get(actionId) ?? [];
	});
}

function toTitleCase(identifier: string) {
	return identifier
		.split(/[-_.\s]+/u)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function renderActionsPanel() {
	return render(
		<RegistryMetadataProvider
			registries={mockGame.sessionRegistries}
			metadata={mockGame.sessionState.metadata}
		>
			<ActionsPanel />
		</RegistryMetadataProvider>,
	);
}

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	requirementIconsMock.mockReset();
	translateRequirementFailureMock.mockClear();
	setScenario();
});

describe('<ActionsPanel />', () => {
	it(
		'renders hire options for generated population roles ' +
			'with derived requirement icons',
		() => {
			renderActionsPanel();
			const raiseAction = metadata.actions.raise;
			expect(requirementIconsMock).toHaveBeenCalledWith(
				raiseAction.id,
				mockGame.translationContext,
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
							metadata.defaultPopulationIcon &&
							!text.includes(metadata.defaultPopulationIcon)
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
		renderActionsPanel();
		const buildingAction = metadata.actions.building;
		if (!buildingAction) {
			throw new Error('Expected building action to be defined');
		}
		expect(requirementIconsMock).toHaveBeenCalledWith(
			buildingAction.id,
			mockGame.translationContext,
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

	it('uses fallback descriptors when metadata omits resource icons and labels', () => {
		renderActionsPanel();
		const descriptor =
			mockGame.sessionState.metadata.resources?.[metadata.upkeepResource];
		expect(descriptor?.icon).toBeUndefined();
		expect(descriptor?.label).toBe(toTitleCase(metadata.upkeepResource));
	});

	it('reuses cached requirement icon arrays for identical lookups', () => {
		renderActionsPanel();
		const raiseAction = metadata.actions.raise;
		const callIndex = requirementIconsMock.mock.calls.findIndex(
			([actionId]) => actionId === raiseAction.id,
		);
		expect(callIndex).toBeGreaterThanOrEqual(0);
		const result = requirementIconsMock.mock.results[callIndex];
		expect(result?.value).toBe(metadata.requirementIcons.get(raiseAction.id));
	});

	it('disables building cards when requirements fail and surfaces translations', () => {
		setScenario({ showBuilding: true });
		renderActionsPanel();
		const buildingDefinition = metadata.building;
		if (!buildingDefinition) {
			throw new Error('Expected building definition to exist');
		}
		const buildingButton = screen.getByRole('button', {
			name: new RegExp(buildingDefinition.name),
		});
		expect(buildingButton).toBeDisabled();
		expect(translateRequirementFailureMock).toHaveBeenCalledWith(
			expect.objectContaining({
				requirement: expect.objectContaining({
					type: 'evaluator',
					method: 'compare',
				}),
			}),
			expect.anything(),
		);
	});

	it(
		'omits the hire section when the helper supplies a non-population ' +
			'action category',
		() => {
			setScenario({
				actionCategories: { population: 'custom-population' },
			});
			expect(metadata.actions.raise.category).toBe('custom-population');
			renderActionsPanel();
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
		renderActionsPanel();
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
					metadata.defaultPopulationIcon &&
					!text.includes(metadata.defaultPopulationIcon)
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
