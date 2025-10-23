/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import GenericActionCard from '../GenericActionCard';
import type { Action, DisplayPlayer } from '../types';
import type { UseActionMetadataResult } from '../../../state/useActionMetadata';
import type { Summary, TranslationContext } from '../../../translation';

vi.mock('../../../translation', () => ({
	describeContent: vi.fn(() => [] as unknown as Summary),
	splitSummary: vi.fn(() => ({ effects: [], description: undefined })),
	translateRequirementFailure: vi.fn((value: unknown) => String(value)),
}));

vi.mock('../../../utils/getRequirementIcons', () => ({
	getRequirementIcons: vi.fn(() => []),
}));

vi.mock('../useEffectGroupOptions', () => ({
	useEffectGroupOptions: () => [],
}));

describe('GenericActionCard ResourceV2 global cost', () => {
	const action: Action = {
		id: 'action.global',
		name: 'Global Action',
	} as Action;

	const player: DisplayPlayer = {
		id: 'player',
		name: 'Player One',
		resources: { 'resource.command': 1 },
		stats: {},
		lands: [],
		population: {},
		buildings: new Set<string>(),
		actions: new Set<string>(['action.global']),
	} as unknown as DisplayPlayer;

	const translationContext: TranslationContext = {
		assets: {
			resources: {
				'resource.command': {
					icon: '🔥',
					label: 'Command',
				},
			},
			upkeep: { icon: '⏳', label: 'Upkeep' },
		},
		actions: new Map(),
	} as unknown as TranslationContext;

	const metadata: UseActionMetadataResult = {
		costs: { 'resource.command': 2 },
		requirements: [],
		groups: [],
		loading: { costs: false, requirements: false, groups: false },
	};

	const summaries = new Map<string, Summary>([
		[action.id, ['Summary'] as unknown as Summary],
	]);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders global action cost and reports shortages', () => {
		render(
			<GenericActionCard
				action={action}
				metadata={metadata}
				summaries={summaries}
				player={player}
				canInteract
				pending={null}
				setPending={vi.fn()}
				cancelPending={vi.fn()}
				beginSelection={vi.fn()}
				handleOptionSelect={vi.fn()}
				translationContext={translationContext}
				actionCostResource="resource.command"
				performAction={vi.fn()}
				handleHoverCard={vi.fn()}
				clearHoverCard={vi.fn()}
				formatRequirement={(value) => value}
				selectResourceDescriptor={(resourceKey) => ({
					id: resourceKey,
					label: 'Command',
					icon: '🔥',
					globalActionCost: { amount: 2 },
				})}
			/>,
		);

		const costEntry = screen.getByText('🔥2');
		expect(costEntry).toBeInTheDocument();

		const cardContainer = document.querySelector('.action-card');
		expect(cardContainer).not.toBeNull();
		expect(cardContainer).toHaveAttribute('title', 'Need 1 🔥 Command');
	});
});
