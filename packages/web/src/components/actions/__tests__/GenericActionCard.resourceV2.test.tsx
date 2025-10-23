import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GenericActionCard from '../GenericActionCard';
import type { ActionCardProps } from '../ActionCard';
import type { UseActionMetadataResult } from '../../../state/useActionMetadata';
import type { Action, DisplayPlayer } from '../types';
import * as translationModule from '../../../translation';
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

describe('GenericActionCard ResourceV2 global costs', () => {
	const action: Action = {
		id: 'survey',
		name: 'Survey',
	} as Action;
	const player: DisplayPlayer = {
		id: 'player-1',
		name: 'Player One',
		resources: { stamina: 1, ore: 5 },
		stats: {},
		lands: [],
		population: {},
		buildings: new Set<string>(),
		actions: new Set<string>(),
	} as unknown as DisplayPlayer;
	const translationContext = {
		assets: {},
		actions: new Map([
			[
				action.id,
				{
					id: action.id,
					name: action.name,
					effects: [],
					costs: { stamina: 2, ore: 3 },
				},
			],
		]),
	} as unknown as TranslationContext;
	const summaries = new Map<string, Summary>([[action.id, ['Summary']]]);
	const baseMetadata: UseActionMetadataResult = {
		costs: { stamina: 2, ore: 3 },
		requirements: [],
		groups: [],
		loading: { costs: false, requirements: false, groups: false },
	};

	const selectResourceDescriptor = (resourceKey: string) => {
		if (resourceKey === 'stamina') {
			return {
				id: 'stamina',
				label: 'Stamina',
				icon: '⚡',
				globalActionCost: { amount: 2 },
			};
		}
		if (resourceKey === 'ore') {
			return { id: 'ore', label: 'Ore', icon: '⛏️' };
		}
		return { id: resourceKey, label: resourceKey };
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		actionCardSpy.mockClear();
		vi.spyOn(translationModule, 'describeContent').mockReturnValue(
			[] as unknown as Summary,
		);
		vi.spyOn(translationModule, 'splitSummary').mockReturnValue({
			effects: [],
		});
                vi.spyOn(
                        translationModule,
                        'translateRequirementFailure',
                ).mockReturnValue('Requirement');
		vi.spyOn(requirementIconModule, 'getRequirementIcons').mockReturnValue([]);
	});

	const renderCard = (metadata: UseActionMetadataResult) => {
		renderToString(
			<GenericActionCard
				action={action}
				metadata={metadata}
				summaries={summaries}
				player={player}
				canInteract
				pending={null as PendingActionState | null}
				setPending={vi.fn()}
				cancelPending={vi.fn()}
				beginSelection={vi.fn()}
				handleOptionSelect={vi.fn()}
				translationContext={translationContext}
				actionCostResource="stamina"
				performAction={vi.fn()}
				handleHoverCard={vi.fn()}
				clearHoverCard={vi.fn()}
				formatRequirement={(value: string) => value}
				selectResourceDescriptor={selectResourceDescriptor}
			/>,
		);
	};

	it('hides global action cost from card display and surfaces missing resource messaging', () => {
		renderCard(baseMetadata);
		const props = actionCardSpy.mock.calls.at(-1)?.[0] as ActionCardProps;
		expect(props.hideActionCostResource).toBe(true);
		expect(props.tooltip).toBe('Need 1 ⚡ Stamina');
		expect(props.costs).toEqual({ stamina: 2, ore: 3 });
	});
});
