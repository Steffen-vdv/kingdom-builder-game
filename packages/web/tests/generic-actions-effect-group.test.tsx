/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { EngineSessionSnapshot } from '@kingdom-builder/engine';
import GenericActions from '../src/components/actions/GenericActions';
import type * as TranslationModule from '../src/translation';
import type * as TranslationContentModule from '../src/translation/content';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createActionsPanelState } from './helpers/createActionsPanelState';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context';
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

function selectRoyalDecree(
	registries: ReturnType<typeof createTestSessionScaffold>['registries'],
) {
	for (const [id, definition] of registries.actions.entries()) {
		const hasOptions = definition.effects?.some((effect) => {
			return Array.isArray((effect as { options?: unknown[] }).options);
		});
		if (hasOptions) {
			return { id, definition } as const;
		}
	}
	throw new Error('Expected an action with selectable effect groups.');
}

function selectActionBySubstring(
	registries: ReturnType<typeof createTestSessionScaffold>['registries'],
	segment: string,
) {
	for (const [id, definition] of registries.actions.entries()) {
		if (
			id.includes(segment) ||
			definition.name?.toLowerCase().includes(segment)
		) {
			return { id, definition } as const;
		}
	}
	throw new Error(`Unable to locate action containing segment "${segment}".`);
}

function createMockGame() {
	const scaffold = createTestSessionScaffold();
	const { registries, metadata, phases, ruleSnapshot } = scaffold;
	const resourceKeys = Object.keys(registries.resources);
	const actionCostResource = ruleSnapshot.tieredResourceKey;
	const secondaryResource =
		resourceKeys.find((key) => key !== actionCostResource) ??
		actionCostResource;
	const { id: royalDecreeId, definition: royalDecreeDef } =
		selectRoyalDecree(registries);
	const developAction = selectActionBySubstring(registries, 'develop');
	const tillAction = selectActionBySubstring(registries, 'till');
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
				slotsUsed: 0,
				tilled: false,
				developments: [],
				slots: [],
			},
			{
				id: 'A-L2',
				slotsMax: 1,
				slotsUsed: 0,
				tilled: false,
				developments: [],
				slots: [],
			},
		],
		buildings: [],
		actions: [royalDecreeId, developAction.id, tillAction.id],
	});
	const opponent = createSnapshotPlayer({
		id: 'B',
		name: 'Opponent',
		resources: {
			[actionCostResource]: 0,
			[secondaryResource]: 0,
		},
		lands: [],
		buildings: [],
		actions: [],
	});
	const sessionState: EngineSessionSnapshot = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases,
		actionCostResource,
		ruleSnapshot,
		metadata,
	});
	const translationContext = createTranslationContext(
		sessionState,
		registries,
		sessionState.metadata,
		{
			ruleSnapshot,
			passiveRecords: sessionState.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		registries,
		sessionState.metadata,
	);
	const sessionRegistries = registries;
	const sessionView = selectSessionView(sessionState, sessionRegistries);
	const session = {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	} as const;
	return {
		...createActionsPanelState({
			actionCostResource,
			phaseId: phases[0]?.id ?? 'phase.action',
		}),
		logOverflowed: false,
		session,
		sessionState,
		sessionView,
		translationContext,
		ruleSnapshot,
		sessionRegistries,
		actionCostResource,
		secondaryResource,
		metadataSelectors,
		actionReferences: {
			royalDecree: { id: royalDecreeId, definition: royalDecreeDef },
			develop: developAction,
			till: tillAction,
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
			[mockGame.actionCostResource]: 1,
			[mockGame.secondaryResource]: 12,
		}));
		mockGame.session.getActionRequirements.mockImplementation(() => []);
		getRequirementIconsMock.mockImplementation(() => []);
		summarizeContentMock.mockImplementation((type: unknown, id: unknown) => {
			if (type === 'action' && id === mockGame.actionReferences.develop.id) {
				return ['🏠 House'];
			}
			return [];
		});
		mockGame.session.getActionOptions.mockImplementation((actionId: string) => {
			if (actionId !== mockGame.actionReferences.royalDecree.id) {
				return [];
			}
			const groups =
				mockGame.actionReferences.royalDecree.definition.effects?.filter(
					(
						effect,
					): effect is {
						id?: string;
						title?: string;
						layout?: string;
						options?: ReadonlyArray<{
							id: string;
							icon?: string;
							actionId?: string;
							params?: Record<string, unknown>;
						}>;
					} => {
						return Array.isArray((effect as { options?: unknown[] }).options);
					},
				);
			const primaryGroup = groups?.find((group) => group.options?.length);
			const primaryOption = primaryGroup?.options?.[0];
			if (!primaryGroup || !primaryOption) {
				return [];
			}
			return [
				{
					id: primaryGroup.id ?? 'royal_decree_develop',
					title: primaryGroup.title ?? 'Choose one:',
					layout: (primaryGroup.layout as 'compact' | undefined) ?? 'compact',
					options: [
						{
							...primaryOption,
							params: {
								...(primaryOption.params ?? {}),
								landId: 'A-L2',
							},
							actionId:
								primaryOption.actionId ?? mockGame.actionReferences.develop.id,
						},
					],
				},
			];
		});
	});

	it('collects choices and parameters before performing royal decree', async () => {
		const royalDecree = mockGame.actionReferences.royalDecree.definition;
		const action = {
			id: mockGame.actionReferences.royalDecree.id,
			name: royalDecree.name,
			icon: royalDecree.icon,
			category: royalDecree.category,
			order: royalDecree.order,
			focus: royalDecree.focus,
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
					selectResourceDescriptor={(resourceKey) => {
						const descriptor =
							mockGame.metadataSelectors.resourceMetadata.byId[resourceKey];
						if (descriptor) {
							return {
								id: descriptor.id,
								label: descriptor.label ?? descriptor.id,
								icon: descriptor.icon,
							};
						}
						return { id: resourceKey, label: resourceKey };
					}}
				/>
			</RegistryMetadataProvider>,
		);

		const actionButton = screen.getByRole('button', { name: /Royal Decree/ });
		fireEvent.click(actionButton);

		const optionButton = await screen.findByRole('button', {
			name: /Develop - 🏠 House/,
		});
		fireEvent.click(optionButton);

		await waitFor(() => {
			expect(mockGame.handlePerform).toHaveBeenCalledTimes(1);
		});
		const [, params] = mockGame.handlePerform.mock.calls[0]!;
		expect(params).toMatchObject({
			choices: {
				royal_decree_develop: {
					optionId: 'royal_decree_house',
					params: { landId: 'A-L2' },
				},
			},
		});
	});
});
