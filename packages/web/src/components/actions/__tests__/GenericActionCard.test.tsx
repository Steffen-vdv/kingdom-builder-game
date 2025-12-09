import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GenericActionCard from '../GenericActionCard';
import type { ActionCardProps } from '../ActionCard';
import type { UseActionMetadataResult } from '../../../state/useActionMetadata';
import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import * as translationModule from '../../../translation';
import type { Action, DisplayPlayer } from '../types';
import type { Summary, TranslationContext } from '../../../translation';
import * as requirementIconModule from '../../../utils/getRequirementIcons';
import type { PendingActionState } from '../GenericActionEntry';

const actionCardSpy = vi.fn();

vi.mock('../ActionCard', () => ({
	__esModule: true,
	default: (props: ActionCardProps) => {
		actionCardSpy(props);
		return null;
	},
}));

vi.mock('../useEffectGroupOptions', () => ({
	useEffectGroupOptions: () => [],
}));

describe('GenericActionCard', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		actionCardSpy.mockClear();
		vi.spyOn(translationModule, 'describeContent').mockReturnValue(
			[] as unknown as Summary,
		);
		vi.spyOn(translationModule, 'splitSummary').mockReturnValue({
			effects: [],
		});
		vi.spyOn(translationModule, 'translateRequirementFailure').mockReturnValue(
			'Requirement',
		);
		vi.spyOn(requirementIconModule, 'getRequirementIcons').mockReturnValue([]);
	});

	const action: Action = {
		id: 'test-action',
		name: 'Test Action',
		focus: 'focus',
	} as Action;

	const player: DisplayPlayer = {
		id: 'player',
		name: 'Player',
		values: { gold: 5 },
		resourceTouched: {},
		resourceBounds: {},
		lands: [],
		buildings: new Set<string>(),
		actions: new Set<string>(),
	} as unknown as DisplayPlayer;

	const createTranslationContext = (
		actionsMap: Map<string, { effects: unknown[] }> = new Map(),
	) =>
		({
			assets: {},
			actions: {
				has: (id: string) => actionsMap.has(id),
				get: (id: string) => actionsMap.get(id),
			},
		}) as unknown as TranslationContext;

	const translationContext = createTranslationContext();

	const summaries = new Map<string, Summary>([[action.id, ['Summary entry']]]);

	const baseRequirement: SessionRequirementFailure = {
		requirement: {
			type: 'resource',
			method: 'spend',
			params: { resource: 'gold', amount: 3 },
		},
	};

	const baseMetadata: UseActionMetadataResult = {
		costs: { gold: 3 },
		requirements: [baseRequirement],
		groups: [],
		loading: { costs: false, requirements: false, groups: false },
	};

	const commonProps = {
		action,
		metadata: baseMetadata,
		summaries,
		player,
		canInteract: true,
		pending: null as PendingActionState | null,
		setPending: vi.fn(),
		cancelPending: vi.fn(),
		beginSelection: vi.fn(),
		handleOptionSelect: vi.fn(),
		translationContext,
		actionCostResource: 'gold',
		performAction: vi.fn(),
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		formatRequirement: (value: string) => value,
		selectResourceDescriptor: () => ({ id: 'gold', label: 'Gold' }),
	};

	const renderCard = (metadata: UseActionMetadataResult) => {
		renderToString(<GenericActionCard {...commonProps} metadata={metadata} />);
	};

	it('retains cached metadata while refresh is loading', () => {
		renderCard(baseMetadata);
		const initialCall = actionCardSpy.mock.calls.at(-1)?.[0] as ActionCardProps;
		expect(initialCall.costs).toEqual({ gold: 3 });
		expect(initialCall.requirements).toEqual(['Requirement']);

		const refreshingMetadata: UseActionMetadataResult = {
			...baseMetadata,
			loading: { costs: true, requirements: true, groups: true },
		};
		renderCard(refreshingMetadata);
		const refreshedCall = actionCardSpy.mock.calls.at(
			-1,
		)?.[0] as ActionCardProps;
		expect(refreshedCall.costs).toEqual({ gold: 3 });
		expect(refreshedCall.requirements).toEqual(['Requirement']);
		expect(refreshedCall.tooltip).toBe('Loading requirements…');
	});

	describe('building ownership', () => {
		const buildingAction: Action = {
			id: 'build_mill',
			name: 'Build Mill',
		} as Action;

		const buildingActionConfig = {
			id: 'build_mill',
			name: 'Build Mill',
			effects: [{ type: 'building', method: 'add', params: { id: 'mill' } }],
		};

		const enabledMetadata: UseActionMetadataResult = {
			costs: { gold: 3 },
			requirements: [],
			groups: [],
			loading: { costs: false, requirements: false, groups: false },
		};

		it('disables action when player already owns the building', () => {
			const playerWithBuilding: DisplayPlayer = {
				...player,
				buildings: new Set(['mill']),
			} as unknown as DisplayPlayer;

			const actionsMap = new Map([['build_mill', buildingActionConfig]]);
			const contextWithAction = createTranslationContext(actionsMap);

			const buildingSummaries = new Map<string, Summary>([
				[buildingAction.id, ['Build a mill']],
			]);

			renderToString(
				<GenericActionCard
					{...commonProps}
					action={buildingAction}
					player={playerWithBuilding}
					metadata={enabledMetadata}
					summaries={buildingSummaries}
					translationContext={contextWithAction}
				/>,
			);

			const call = actionCardSpy.mock.calls.at(-1)?.[0] as ActionCardProps;
			expect(call.enabled).toBe(false);
			expect(call.tooltip).toBe('Already built');
		});

		it('enables action when player does not own the building', () => {
			const playerWithoutBuilding: DisplayPlayer = {
				...player,
				buildings: new Set(['market']),
			} as unknown as DisplayPlayer;

			const actionsMap = new Map([['build_mill', buildingActionConfig]]);
			const contextWithAction = createTranslationContext(actionsMap);

			const buildingSummaries = new Map<string, Summary>([
				[buildingAction.id, ['Build a mill']],
			]);

			renderToString(
				<GenericActionCard
					{...commonProps}
					action={buildingAction}
					player={playerWithoutBuilding}
					metadata={enabledMetadata}
					summaries={buildingSummaries}
					translationContext={contextWithAction}
				/>,
			);

			const call = actionCardSpy.mock.calls.at(-1)?.[0] as ActionCardProps;
			expect(call.enabled).toBe(true);
			expect(call.tooltip).toBeUndefined();
		});

		it('does not affect non-building actions', () => {
			const nonBuildingAction: Action = {
				id: 'raid',
				name: 'Raid',
			} as Action;

			const nonBuildingActionConfig = {
				id: 'raid',
				name: 'Raid',
				effects: [
					{ type: 'resource', method: 'change', params: { amount: 5 } },
				],
			};

			const actionsMap = new Map([['raid', nonBuildingActionConfig]]);
			const contextWithAction = createTranslationContext(actionsMap);

			const raidSummaries = new Map<string, Summary>([
				[nonBuildingAction.id, ['Raid enemy']],
			]);

			renderToString(
				<GenericActionCard
					{...commonProps}
					action={nonBuildingAction}
					player={player}
					metadata={enabledMetadata}
					summaries={raidSummaries}
					translationContext={contextWithAction}
				/>,
			);

			const call = actionCardSpy.mock.calls.at(-1)?.[0] as ActionCardProps;
			expect(call.enabled).toBe(true);
			expect(call.tooltip).toBeUndefined();
		});
	});
});
