/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
} from '@kingdom-builder/protocol';
import type {
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionRegistriesPayload,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
	SessionRuleSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import ResourceBar from '../ResourceBar';
import { RegistryMetadataProvider } from '../../../contexts/RegistryMetadataContext';
import { deserializeSessionRegistries } from '../../../state/sessionRegistries';
import type { GameEngineContextValue } from '../../../state/GameContext.types';
import type { TranslationContext } from '../../../translation/context/types';
import type { NextTurnForecast } from '../../../state/useNextTurnForecast';
import type { HoverCard } from '../../../state/useHoverCard';

const handleHoverCard = vi.fn();
const clearHoverCard = vi.fn();
let mockGame: GameEngineContextValue;
let mockForecast: NextTurnForecast;

vi.mock('../../../state/GameContext', () => ({
	useGameEngine: () => mockGame,
	useOptionalGameEngine: () => mockGame,
}));

vi.mock('../../../state/useNextTurnForecast', () => ({
	useNextTurnForecast: () => mockForecast,
}));

describe('ResourceBar ResourceV2 grouping', () => {
	const parentDefinition: ResourceV2GroupMetadata['parent'] = {
		id: 'resource.parent.elemental',
		name: 'Elemental Totals',
		order: 0,
		relation: 'sumOfAll',
		isPercent: true,
		trackValueBreakdown: true,
		trackBoundBreakdown: false,
		icon: '🜁',
		description: 'Combined attunement.',
	};
	const groupDefinition: ResourceV2GroupMetadata = {
		id: 'resource.group.elemental',
		name: 'Elemental Pools',
		order: 0,
		children: ['resource.fire', 'resource.ice'],
		parent: parentDefinition,
		description: 'Elemental channels.',
	};
	const fireDefinition: ResourceV2Definition = {
		id: 'resource.fire',
		name: 'Fire Sigils',
		order: 1,
		icon: '🔥',
		description: 'Harnessed flame.',
		groupId: groupDefinition.id,
		isPercent: true,
	};
	const iceDefinition: ResourceV2Definition = {
		id: 'resource.ice',
		name: 'Frost Sigils',
		order: 2,
		icon: '❄️',
		description: 'Frozen focus.',
		groupId: groupDefinition.id,
		isPercent: true,
	};
	const parentSnapshot: SessionResourceV2GroupParentSnapshot = {
		id: parentDefinition.id,
		name: parentDefinition.name,
		order: parentDefinition.order ?? 0,
		relation: parentDefinition.relation,
		isPercent: parentDefinition.isPercent ?? false,
		trackValueBreakdown: parentDefinition.trackValueBreakdown ?? false,
		trackBoundBreakdown: parentDefinition.trackBoundBreakdown ?? false,
		...(parentDefinition.icon ? { icon: parentDefinition.icon } : {}),
		...(parentDefinition.description
			? { description: parentDefinition.description }
			: {}),
	};
	const groupSnapshot: SessionResourceV2GroupSnapshot = {
		id: groupDefinition.id,
		name: groupDefinition.name,
		order: groupDefinition.order ?? 0,
		children: [...groupDefinition.children],
		parent: parentSnapshot,
		...(groupDefinition.description
			? { description: groupDefinition.description }
			: {}),
	};
	const fireSnapshot: SessionResourceV2MetadataSnapshot = {
		id: fireDefinition.id,
		name: fireDefinition.name,
		order: fireDefinition.order ?? 0,
		icon: fireDefinition.icon!,
		description: fireDefinition.description!,
		isPercent: true,
		groupId: groupDefinition.id,
		parentId: parentDefinition.id,
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
	};
	const iceSnapshot: SessionResourceV2MetadataSnapshot = {
		id: iceDefinition.id,
		name: iceDefinition.name,
		order: iceDefinition.order ?? 0,
		icon: iceDefinition.icon!,
		description: iceDefinition.description!,
		isPercent: true,
		groupId: groupDefinition.id,
		parentId: parentDefinition.id,
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
	};

	const registriesPayload: SessionRegistriesPayload = {
		actions: {},
		actionCategories: {},
		buildings: {},
		developments: {},
		populations: {},
		resources: {
			[fireDefinition.id]: {
				key: fireDefinition.id,
				label: fireDefinition.name,
				icon: fireDefinition.icon!,
				description: fireDefinition.description!,
			},
			[iceDefinition.id]: {
				key: iceDefinition.id,
				label: iceDefinition.name,
				icon: iceDefinition.icon!,
				description: iceDefinition.description!,
			},
		},
		resourcesV2: {
			[fireDefinition.id]: fireDefinition,
			[iceDefinition.id]: iceDefinition,
		},
		resourceGroups: {
			[groupDefinition.id]: groupDefinition,
		},
	};
	const registries = deserializeSessionRegistries(registriesPayload);

	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources: {
			[fireDefinition.id]: {
				label: fireDefinition.name,
				icon: fireDefinition.icon!,
				description: fireDefinition.description!,
			},
			[iceDefinition.id]: {
				label: iceDefinition.name,
				icon: iceDefinition.icon!,
				description: iceDefinition.description!,
			},
		},
		populations: {},
		buildings: {},
		developments: {},
		stats: {},
		phases: {},
		triggers: {},
		assets: {
			land: { label: 'Land' },
			slot: { label: 'Development Slot' },
			passive: { label: 'Passive', icon: '✨' },
		},
		overview: {
			hero: { title: 'Overview', tokens: {} },
			sections: [],
			tokens: {},
		},
		resourceMetadata: {
			[fireDefinition.id]: fireSnapshot,
			[iceDefinition.id]: iceSnapshot,
		},
		resourceGroups: {
			[groupDefinition.id]: groupSnapshot,
		},
		resourceGroupParents: {
			[parentDefinition.id]: parentSnapshot,
		},
		orderedResourceIds: [fireDefinition.id, iceDefinition.id],
		orderedResourceGroupIds: [groupDefinition.id],
		parentIdByResourceId: {
			[fireDefinition.id]: parentDefinition.id,
			[iceDefinition.id]: parentDefinition.id,
		},
	} as SessionSnapshotMetadata;

	const ruleSnapshot: SessionRuleSnapshot = {
		tierDefinitions: [],
		tieredResourceKey: 'resource.untracked',
		winConditions: [],
	} as SessionRuleSnapshot;

	const playerId: SessionPlayerId = 'A';
	const player: SessionPlayerStateSnapshot = {
		id: playerId,
		name: 'Elementalist',
		resources: {},
		stats: {},
		statsHistory: {},
		population: {},
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
		resourceV2: {
			values: {
				[fireDefinition.id]: 30,
				[iceDefinition.id]: 45,
			},
			lowerBounds: {},
			upperBounds: {},
			touched: {},
		},
	} as SessionPlayerStateSnapshot;

	beforeEach(() => {
		handleHoverCard.mockClear();
		clearHoverCard.mockClear();
		const translationContext = {} as TranslationContext;
		mockGame = {
			translationContext,
			handleHoverCard,
			clearHoverCard,
			ruleSnapshot,
		} as unknown as GameEngineContextValue;
		mockForecast = {
			[player.id]: {
				resources: {
					[fireDefinition.id]: 5,
					[iceDefinition.id]: 5,
				},
				stats: {},
				population: {},
			},
		};
	});

	it('renders group header, parent totals, and hovercard content for ResourceV2 parents', () => {
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<ResourceBar player={player} />
			</RegistryMetadataProvider>,
		);

		expect(screen.getByText('Elemental Pools')).toBeInTheDocument();

		const parentButton = screen.getByRole('button', {
			name: 'Elemental Totals: 75% (+10%)',
		});
		expect(parentButton).toHaveTextContent('75%');
		expect(parentButton).toHaveTextContent('(+10%)');

		const fireButton = screen.getByRole('button', {
			name: 'Fire Sigils: 30% (+5%)',
		});
		expect(fireButton).toHaveTextContent('30%');
		expect(fireButton).toHaveTextContent('(+5%)');

		fireEvent.mouseEnter(parentButton);
		expect(handleHoverCard).toHaveBeenCalled();
		const latestCall = handleHoverCard.mock.calls.at(-1);
		const hoverCard = (latestCall?.[0] ?? undefined) as HoverCard | undefined;
		expect(hoverCard?.title).toBe('🜁 Elemental Totals');
		expect(hoverCard?.description).toBe('Combined attunement.');
		expect(hoverCard?.effects).toEqual([
			{ title: '🔥 Fire Sigils', items: ['Harnessed flame.'] },
			{ title: '❄️ Frost Sigils', items: ['Frozen focus.'] },
		]);
	});
});
