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

	const translationContext = {
		assets: {},
		actions: new Map(),
	} as unknown as TranslationContext;

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
});
