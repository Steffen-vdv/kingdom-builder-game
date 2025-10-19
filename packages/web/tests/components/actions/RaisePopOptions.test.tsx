/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import RaisePopOptions from '../../../src/components/actions/RaisePopOptions';
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
import { RemoteSessionAdapter } from '../../../src/state/remoteSessionAdapter';
import type { GameEngineContextValue } from '../../../src/state/GameContext.types';
import type {
	SessionPlayerId,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol/session';
import type { Action } from '../../../src/components/actions/types';
import type { SessionRegistries } from '../../../src/state/sessionRegistries';
import type { GameApi } from '../../../src/services/gameApi';

interface RaisePopScenario {
	registries: SessionRegistries;
	metadata: ReturnType<typeof createTestSessionScaffold>['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	mockGame: GameEngineContextValue;
	action: Action;
	player: GameEngineContextValue['selectors']['sessionView']['active'];
	populationIds: string[];
	adapter: RemoteSessionAdapter;
}

function createRaisePopScenario(
	options: { omitMetadataFor?: string } = {},
): RaisePopScenario {
	const scaffold = createTestSessionScaffold();
	const registries = scaffold.registries;
	const metadata = structuredClone(scaffold.metadata);
	if (options.omitMetadataFor && metadata.populations) {
		delete metadata.populations[options.omitMetadataFor];
	}
	const populationIds = registries.populations.keys();
	if (!populationIds.length) {
		throw new Error(
			'Expected population roles to exist for raise population options.',
		);
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
	const definition = registries.actions.get('raise_pop');
	if (!definition) {
		throw new Error('Expected raise_pop definition in registries.');
	}
	const translated = mockGame.translationContext.actions.get('raise_pop');
	const action: Action = {
		id: definition.id,
		name: definition.name ?? definition.id,
		icon: definition.icon,
		focus: definition.focus,
		requirements: translated?.requirements ?? definition.requirements,
		effects: translated?.effects ?? definition.effects,
	} as Action;
	const activeView = mockGame.selectors.sessionView.active;
	if (!activeView) {
		throw new Error('Expected active player view in session.');
	}
	const adapter = new RemoteSessionAdapter(mockGame.sessionId, {
		ensureGameApi: vi.fn(() => ({}) as GameApi),
		runAiTurn: vi.fn().mockResolvedValue({
			sessionId: mockGame.sessionId,
			snapshot: sessionState,
			registries,
			ranTurn: false,
		}),
	});
	adapter.setActionCosts(action.id, { gold: 5, ap: 1 });
	adapter.setActionRequirements(action.id, []);
	adapter.setActionOptions(action.id, []);
	mockGame.requests.getActionCosts = adapter.getActionCosts.bind(adapter);
	mockGame.requests.getActionRequirements =
		adapter.getActionRequirements.bind(adapter);
	mockGame.requests.readActionMetadata =
		adapter.readActionMetadata.bind(adapter);
	mockGame.requests.subscribeActionMetadata = (actionId, params, listener) =>
		adapter.subscribeActionMetadata(actionId, params, listener);
	mockGame.requests.enqueueTask = adapter.enqueue.bind(adapter);
	return {
		registries,
		metadata,
		metadataSelectors,
		mockGame: mockGame as GameEngineContextValue,
		action,
		player: activeView,
		populationIds,
		adapter,
	};
}

let scenario = createRaisePopScenario();
let currentGame = scenario.mockGame;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

describe('<RaisePopOptions />', () => {
	beforeEach(() => {
		scenario = createRaisePopScenario();
		currentGame = scenario.mockGame;
	});

	it('renders population options using registry metadata', () => {
		const {
			registries,
			metadata,
			metadataSelectors,
			action,
			player,
			populationIds,
		} = scenario;
		const selectResourceDescriptor = (resourceKey: string) =>
			metadataSelectors.resourceMetadata.select(resourceKey);
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={true}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			</RegistryMetadataProvider>,
		);
		const optionButtons = screen.getAllByRole('button', { name: /hire/i });
		expect(optionButtons.length).toBeGreaterThan(0);
		const [primaryRole] = populationIds;
		const primaryDescriptor = toDescriptorDisplay(
			metadataSelectors.populationMetadata.select(primaryRole),
		);
		const primaryButton = optionButtons.find((button) =>
			button.textContent?.includes(primaryDescriptor.label),
		);
		expect(primaryButton).toBeDefined();
		if (primaryDescriptor.icon) {
			expect(primaryButton?.textContent ?? '').toContain(
				primaryDescriptor.icon,
			);
			const summaryItems = primaryButton
				? within(primaryButton).queryAllByRole('listitem')
				: [];
			if (summaryItems.length > 0) {
				expect(summaryItems[0]?.textContent ?? '').toContain(
					primaryDescriptor.icon,
				);
			}
		}
	});

	it('falls back to population definitions when metadata is missing', () => {
		const fallbackRole =
			scenario.populationIds.at(1) ?? scenario.populationIds[0];
		scenario = createRaisePopScenario({ omitMetadataFor: fallbackRole });
		currentGame = scenario.mockGame;
		const { registries, metadata, metadataSelectors, action, player } =
			scenario;
		const selectResourceDescriptor = (resourceKey: string) =>
			metadataSelectors.resourceMetadata.select(resourceKey);
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={true}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			</RegistryMetadataProvider>,
		);
		const descriptor = toDescriptorDisplay(
			metadataSelectors.populationMetadata.select(fallbackRole),
		);
		const fallbackButton = screen
			.getAllByRole('button', { name: /hire/i })
			.find((button) => button.textContent?.includes(descriptor.label));
		expect(fallbackButton).toBeDefined();
		const expectedIcon =
			descriptor.icon ?? registries.populations.get(fallbackRole)?.icon ?? '';
		if (expectedIcon) {
			expect(fallbackButton?.textContent ?? '').toContain(expectedIcon);
		}
		if (fallbackButton && expectedIcon) {
			const summaryItems = within(fallbackButton).queryAllByRole('listitem');
			if (summaryItems.length > 0) {
				expect(summaryItems[0]?.textContent ?? '').toContain(expectedIcon);
			}
		}
	});

	it('disables hire options when population is at capacity', () => {
		const { registries, metadata, metadataSelectors, action, player, adapter } =
			scenario;
		const requirementFailure: SessionRequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					operator: 'lt',
					left: { type: 'population', params: { role: '$role' } },
					right: { type: 'stat', params: { key: 'maxPopulation' } },
				},
			},
			details: { left: 3, right: 3 },
		};
		adapter.setActionRequirements(action.id, [requirementFailure]);
		const selectResourceDescriptor = (resourceKey: string) =>
			metadataSelectors.resourceMetadata.select(resourceKey);
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={true}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			</RegistryMetadataProvider>,
		);
		const hireButtons = screen.getAllByRole('button', { name: /hire/i });
		expect(hireButtons.length).toBeGreaterThan(0);
		const primaryHireButton = hireButtons[0];
		expect(primaryHireButton).toBeDisabled();
		const card = primaryHireButton.closest('.action-card');
		expect(card).not.toBeNull();
		expect(card).toHaveAttribute(
			'title',
			expect.stringContaining('Population is at capacity'),
		);
	});
});
