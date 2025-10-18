/** @vitest-environment jsdom */
import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
// prettier-ignore
import type {
	LegacyGameEngineContextValue,
} from '../../../src/state/GameContext.types';
import type {
	SessionPlayerId,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol/session';
import type { Action } from '../../../src/components/actions/types';
import type { SessionRegistries } from '../../../src/state/sessionRegistries';

afterEach(() => {
	cleanup();
});

interface RaisePopScenario {
	registries: SessionRegistries;
	metadata: ReturnType<typeof createTestSessionScaffold>['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	mockGame: LegacyGameEngineContextValue;
	action: Action;
	player: LegacyGameEngineContextValue['sessionView']['active'];
	populationIds: string[];
	setRoleRequirements: (
		role: string,
		failures: SessionRequirementFailure[],
	) => void;
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
	const activeView = mockGame.sessionView.active;
	if (!activeView) {
		throw new Error('Expected active player view in session.');
	}
	const requirementStore = new Map<string, SessionRequirementFailure[]>();
	const requirementListeners = new Map<
		string,
		Set<(snapshot: { requirements?: SessionRequirementFailure[] }) => void>
	>();
	for (const roleId of populationIds) {
		requirementStore.set(roleId, []);
	}
	const cloneFailures = (failures: SessionRequirementFailure[]) =>
		failures.map((failure) => ({
			requirement: failure.requirement,
			...(failure.details ? { details: { ...failure.details } } : {}),
			...(failure.message ? { message: failure.message } : {}),
		}));
	const setRoleRequirements = (
		role: string,
		failures: SessionRequirementFailure[],
	) => {
		requirementStore.set(role, cloneFailures(failures));
		const listeners = requirementListeners.get(role);
		if (!listeners) {
			return;
		}
		const snapshot = { requirements: cloneFailures(failures) };
		for (const listener of listeners) {
			listener(snapshot);
		}
	};
	mockGame.session = {
		getActionCosts: vi.fn(() => ({ gold: 5, ap: 1 })),
		getActionRequirements: vi.fn((_, params?: { role?: string }) => {
			const role = params?.role;
			if (!role) {
				return [];
			}
			return cloneFailures(requirementStore.get(role) ?? []);
		}),
		getActionOptions: vi.fn(() => []),
		readActionMetadata: vi.fn((_, params?: { role?: string }) => {
			const role = params?.role;
			if (!role) {
				return {};
			}
			const failures = requirementStore.get(role);
			if (!failures) {
				return {};
			}
			return { requirements: cloneFailures(failures) };
		}),
		subscribeActionMetadata: vi.fn((_, params, listener) => {
			const role = params?.role;
			if (!role) {
				return () => {};
			}
			let listeners = requirementListeners.get(role);
			if (!listeners) {
				listeners = new Set();
				requirementListeners.set(role, listeners);
			}
			listeners.add(listener);
			return () => {
				listeners?.delete(listener);
			};
		}),
	} as unknown as LegacyGameEngineContextValue['session'];
	return {
		registries,
		metadata,
		metadataSelectors,
		mockGame: mockGame as LegacyGameEngineContextValue,
		action,
		player: activeView,
		populationIds,
		setRoleRequirements,
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

	it('disables hire options when requirements are not met', () => {
		const failure: SessionRequirementFailure = {
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
			details: {
				left: { value: 3 },
				right: { value: 3 },
			},
		};
		for (const role of scenario.populationIds) {
			scenario.setRoleRequirements(role, [failure]);
		}
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
		const hireButtons = screen.getAllByRole('button', { name: /hire/i });
		expect(hireButtons.length).toBeGreaterThan(0);
		for (const button of hireButtons) {
			expect(button).toBeDisabled();
		}
	});
});
