/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import {
	clearSessionActionMetadataStore,
	seedSessionActionMetadata,
} from '../../helpers/mockSessionActionMetadataStore';
import HireOptions from '../../../src/components/actions/HireOptions';
// prettier-ignore
import {
        RegistryMetadataProvider,
} from '../../../src/contexts/RegistryMetadataContext';
// prettier-ignore
import {
        createTestRegistryMetadata,
} from '../../helpers/registryMetadata';
// prettier-ignore
import {
        toDescriptorDisplay,
} from '../../../src/components/player/registryDisplays';
import { createTestSessionScaffold } from '../../helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../../helpers/sessionFixtures';
import { createPassiveGame } from '../../helpers/createPassiveDisplayGame';
// prettier-ignore
import type {
        GameEngineContextValue,
} from '../../../src/state/GameContext.types';
import type {
	SessionPlayerId,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol/session';
import type { Action } from '../../../src/components/actions/types';
import type { SessionRegistries } from '../../../src/state/sessionRegistries';
import type { ActionCategoryDescriptor } from '../../../src/components/actions/ActionCategoryHeader';

interface HireScenario {
	registries: SessionRegistries;
	metadata: ReturnType<typeof createTestSessionScaffold>['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	mockGame: GameEngineContextValue;
	actions: Action[];
	player: GameEngineContextValue['selectors']['sessionView']['active'];
	populationIds: string[];
}

type ActionEffect = {
	type?: string;
	method?: string;
	params?: Record<string, unknown>;
};

function extractHireActionRole(action: Action): string | undefined {
	const effects = (action.effects as ActionEffect[]) ?? [];
	for (const effect of effects) {
		if (effect.type === 'population' && effect.method === 'add') {
			const role = effect.params?.['role'];
			if (typeof role === 'string') {
				return role;
			}
		}
	}
	return undefined;
}

function createHireScenario(
	options: { omitMetadataFor?: string } = {},
): HireScenario {
	clearSessionActionMetadataStore();
	const scaffold = createTestSessionScaffold();
	const registries = scaffold.registries;
	const metadata = structuredClone(scaffold.metadata);
	if (options.omitMetadataFor && metadata.populations) {
		delete metadata.populations[options.omitMetadataFor];
	}
	const populationIds = registries.populations.keys();
	if (!populationIds.length) {
		throw new Error('Expected population roles to exist for hire options.');
	}
	const [primaryRole, secondaryRole] = populationIds;
	const activePlayer = createSnapshotPlayer({
		id: 'player-1' as SessionPlayerId,
		name: 'Player One',
		resources: { gold: 12, ap: 5 },
		stats: { maxPopulation: 3 },
		population: {
			[primaryRole]: 2,
			...(secondaryRole ? { [secondaryRole]: 1 } : {}),
		},
	});
	const opponent = createSnapshotPlayer({
		id: 'player-2' as SessionPlayerId,
		name: 'Player Two',
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	const { mockGame } = createPassiveGame(sessionState, {
		ruleSnapshot: scaffold.ruleSnapshot,
		registries,
		metadata,
	});
	const metadataSelectors = createTestRegistryMetadata(registries, metadata);
	const hireActionEntries = registries.actions
		.entries()
		.filter(([id]) => id.startsWith('hire:'))
		.sort(([left], [right]) => left.localeCompare(right));
	const actions: Action[] = hireActionEntries.map(([actionId, definition]) => {
		const translated = mockGame.translationContext.actions.get(actionId);
		const action: Action = {
			id: definition.id,
			name: definition.name ?? definition.id,
			icon: definition.icon,
			focus: definition.focus,
			requirements: translated?.requirements ?? definition.requirements,
			effects: translated?.effects ?? definition.effects,
		} as Action;
		seedSessionActionMetadata(mockGame.sessionId, action.id, {
			costs: { gold: 5, ap: 1 },
			requirements: [],
			groups: [],
		});
		return action;
	});
	if (actions.length === 0) {
		throw new Error('Expected hire actions to be available.');
	}
	const activeView = mockGame.selectors.sessionView.active;
	if (!activeView) {
		throw new Error('Expected active player view in session.');
	}
	return {
		registries,
		metadata,
		metadataSelectors,
		mockGame: mockGame as GameEngineContextValue,
		actions,
		player: activeView,
		populationIds,
	};
}

const categoryDescriptor: ActionCategoryDescriptor = {
	icon: '👶',
	label: 'Hire',
	subtitle: 'Recruit specialists',
};

let scenario = createHireScenario();
let currentGame = scenario.mockGame;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

describe('<HireOptions />', () => {
	beforeEach(() => {
		scenario = createHireScenario();
		currentGame = scenario.mockGame;
	});

	it('renders hire actions using registry metadata', () => {
		const { registries, metadata, metadataSelectors, actions } = scenario;
		const selectResourceDescriptor = (resourceKey: string) =>
			metadataSelectors.resourceMetadata.select(resourceKey);
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<HireOptions
					actions={actions}
					player={scenario.player}
					canInteract={true}
					selectResourceDescriptor={selectResourceDescriptor}
					category={categoryDescriptor}
				/>
			</RegistryMetadataProvider>,
		);
		const optionButtons = screen
			.getAllByRole('button')
			.filter((button) =>
				button.classList.contains('action-card__face--front'),
			);
		expect(optionButtons).toHaveLength(actions.length);
		actions.forEach((action) => {
			const roleId = extractHireActionRole(action) ?? action.id;
			const descriptor = toDescriptorDisplay(
				metadataSelectors.populationMetadata.select(roleId),
			);
			const button = optionButtons.find((entry) =>
				entry.textContent?.includes(descriptor.label),
			);
			expect(button).toBeDefined();
			if (descriptor.icon) {
				expect(button?.textContent ?? '').toContain(descriptor.icon);
				const summaryItems = button
					? within(button).queryAllByRole('listitem')
					: [];
				if (summaryItems.length > 0) {
					expect(summaryItems[0]?.textContent ?? '').toContain(descriptor.icon);
				}
			}
		});
	});

	it('falls back to population definitions when metadata is missing', () => {
		const fallbackRole =
			scenario.populationIds.at(1) ?? scenario.populationIds[0];
		scenario = createHireScenario({ omitMetadataFor: fallbackRole });
		currentGame = scenario.mockGame;
		const { registries, metadata, metadataSelectors, actions } = scenario;
		const selectResourceDescriptor = (resourceKey: string) =>
			metadataSelectors.resourceMetadata.select(resourceKey);
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<HireOptions
					actions={actions}
					player={scenario.player}
					canInteract={true}
					selectResourceDescriptor={selectResourceDescriptor}
					category={categoryDescriptor}
				/>
			</RegistryMetadataProvider>,
		);
		const fallbackAction = actions.find(
			(entry) => extractHireActionRole(entry) === fallbackRole,
		);
		expect(fallbackAction).toBeDefined();
		const optionButtons = screen
			.getAllByRole('button')
			.filter((button) =>
				button.classList.contains('action-card__face--front'),
			);
		const fallbackDefinition = registries.populations.get(fallbackRole);
		const expectedIcon = fallbackDefinition?.icon ?? '';
		const descriptor = toDescriptorDisplay(
			metadataSelectors.populationMetadata.select(fallbackRole),
		);
		const button = optionButtons.find((entry) =>
			entry.textContent?.includes(descriptor.label),
		);
		expect(button).toBeDefined();
		if (expectedIcon) {
			expect(button?.textContent ?? '').toContain(expectedIcon);
			const summaryItems = button
				? within(button).queryAllByRole('listitem')
				: [];
			if (summaryItems.length > 0) {
				expect(summaryItems[0]?.textContent ?? '').toContain(expectedIcon);
			}
		}
	});

	it('disables hire options when population is at capacity', () => {
		const { registries, metadata, metadataSelectors, actions, mockGame } =
			scenario;
		const requirementFailure: SessionRequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					operator: 'lt',
					left: { type: 'population' },
					right: {
						type: 'stat',
						params: { key: 'maxPopulation' },
					},
				},
			},
			details: { left: 3, right: 3 },
		};
		const firstAction = actions[0];
		seedSessionActionMetadata(mockGame.sessionId, firstAction.id, {
			costs: { gold: 5, ap: 1 },
			requirements: [requirementFailure],
			groups: [],
		});
		const selectResourceDescriptor = (resourceKey: string) =>
			metadataSelectors.resourceMetadata.select(resourceKey);
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<HireOptions
					actions={actions}
					player={scenario.player}
					canInteract={true}
					selectResourceDescriptor={selectResourceDescriptor}
					category={categoryDescriptor}
				/>
			</RegistryMetadataProvider>,
		);
		const hireButtons = screen
			.getAllByRole('button')
			.filter((button) =>
				button.classList.contains('action-card__face--front'),
			);
		expect(hireButtons.length).toBeGreaterThan(0);
		const primaryButton = hireButtons[0];
		expect(primaryButton).toBeDisabled();
		const card = primaryButton.closest('.action-card');
		expect(card).not.toBeNull();
		expect(card).toHaveAttribute(
			'title',
			expect.stringContaining('Population is at capacity'),
		);
	});
});
