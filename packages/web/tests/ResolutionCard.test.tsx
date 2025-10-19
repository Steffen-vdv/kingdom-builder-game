/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { ResolutionCard } from '../src/components/ResolutionCard';
import type { ActionResolution } from '../src/state/useActionResolution';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

function createResolution(
	overrides: Partial<ActionResolution>,
): ActionResolution {
	return {
		lines: ['First line'],
		visibleLines: ['First line'],
		visibleTimeline: [],
		isComplete: true,
		summaries: [],
		source: 'action',
		requireAcknowledgement: true,
		...overrides,
	} as ActionResolution;
}

describe('<ResolutionCard />', () => {
	afterEach(() => {
		cleanup();
	});
	it('shows labels for action-based resolutions', () => {
		const resolution = createResolution({
			action: {
				id: 'action-id',
				name: 'Test Action',
				icon: '⚔️',
			},
			source: {
				kind: 'action',
				label: 'Action',
				id: 'action-id',
				name: 'Test Action',
				icon: '⚔️',
			},
			actorLabel: 'Played by',
			player: {
				id: 'player-1',
				name: 'Player One',
			},
		});

		render(
			<ResolutionCard
				resolution={resolution}
				title="Resolution Title"
				onContinue={() => {}}
			/>,
		);

		expect(screen.getByText('Action - Test Action')).toBeInTheDocument();
		const actionPlayerLabel = screen.getByLabelText('Player');
		expect(actionPlayerLabel).toHaveTextContent('Player One');
	});

	it('renders custom source metadata when provided', () => {
		const resolution = createResolution({
			source: {
				kind: 'phase',
				label: 'Growth Phase',
				name: 'Growth Phase',
			},
			actorLabel: 'Growth Phase',
			player: {
				id: 'player-2',
				name: 'Player Two',
			},
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		expect(screen.getByText('Growth Phase')).toBeInTheDocument();
		const phasePlayerLabel = screen.getByLabelText('Player');
		expect(phasePlayerLabel).toHaveTextContent('Player Two');
	});

	it('hides the continue button when acknowledgement is not required', () => {
		const resolution = createResolution({
			requireAcknowledgement: false,
		});
		expect(resolution.requireAcknowledgement).toBe(false);

		const { queryByRole } = render(
			<ResolutionCard resolution={resolution} onContinue={() => {}} />,
		);

		expect(queryByRole('button', { name: 'Continue' })).toBeNull();
	});

	it('separates cost entries from effect entries', () => {
		const resolution = createResolution({
			visibleTimeline: [
				{ text: '🏗️ Develop', depth: 0, kind: 'headline' },
				{ text: '💲 Action cost', depth: 1, kind: 'cost' },
				{ text: 'Gold -3', depth: 2, kind: 'cost-detail' },
				{ text: '🪄 Effect happens', depth: 1, kind: 'change' },
			],
			visibleLines: [],
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		const costLabel = screen.getByText('Cost');
		const costList = costLabel.nextElementSibling;
		const effectLabel = screen.getByText('Effects');
		const effectList = effectLabel.parentElement?.nextElementSibling ?? null;

		expect(costList).not.toBeNull();
		expect(effectList).not.toBeNull();

		if (!costList || !effectList) {
			throw new Error('Expected cost and effect sections to be rendered');
		}

		expect(within(costList).getByText('💲 Action cost')).toBeInTheDocument();
		expect(within(costList).getByText('Gold -3')).toBeInTheDocument();
		expect(within(effectList).queryByText('💲 Action cost')).toBeNull();
		expect(
			within(effectList).getByText('🪄 Effect happens'),
		).toBeInTheDocument();
	});

	it('renders nested cost groups and effect hierarchies', () => {
		const visibleTimeline: ActionLogLineDescriptor[] = [
			{ text: '🛠️ Forge Relic', depth: 0, kind: 'headline' },
			{ text: '💲 Action cost', depth: 1, kind: 'cost' },
			{ text: 'Gold -3', depth: 2, kind: 'cost-detail' },
			{ text: 'Discounts applied', depth: 3, kind: 'cost-detail' },
			{ text: 'Happiness -1', depth: 4, kind: 'cost-detail' },
			{ text: '🪄 Channel the forge', depth: 1, kind: 'group' },
			{ text: 'Gain 2 Relics', depth: 2, kind: 'effect' },
			{ text: 'Summon guardian golem', depth: 3, kind: 'subaction' },
			{ text: 'Army +1', depth: 4, kind: 'change' },
			{ text: 'Fortification +1', depth: 4, kind: 'change' },
		];
		const resolution = createResolution({
			action: {
				id: 'forge-relic',
				name: 'Forge Relic',
				icon: '🛠️',
			},
			visibleTimeline,
			visibleLines: [],
		});

		render(
			<ResolutionCard
				resolution={resolution}
				title="Forge Relic"
				onContinue={() => {}}
			/>,
		);

		const costLabel = screen.getByText('Cost');
		const costList = costLabel.nextElementSibling;
		const effectsLabel = screen.getByText('Effects');
		const effectsList = effectsLabel.parentElement?.nextElementSibling ?? null;

		expect(costList).not.toBeNull();
		expect(effectsList).not.toBeNull();

		if (!costList || !effectsList) {
			throw new Error('Expected cost and effect sections to be rendered');
		}

		const costEntries = within(costList);
		const actionCost = costEntries.getByText('💲 Action cost');
		const goldCost = costEntries.getByText('Gold -3');
		const discountGroup = costEntries.getByText('Discounts applied');
		const happinessCost = costEntries.getByText('Happiness -1');
		const actionCostContainer = actionCost.parentElement;
		const goldCostContainer = goldCost.parentElement;
		const discountContainer = discountGroup.parentElement;
		const happinessContainer = happinessCost.parentElement;

		if (
			!actionCostContainer ||
			!goldCostContainer ||
			!discountContainer ||
			!happinessContainer
		) {
			throw new Error('Expected cost entries to have container elements');
		}

		expect(actionCostContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(goldCostContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(discountContainer).toHaveStyle({ marginLeft: '1.75rem' });
		expect(happinessContainer).toHaveStyle({ marginLeft: '2.625rem' });

		const effectEntries = within(effectsList);
		const headline = effectEntries.getByText('🛠️ Forge Relic');
		const group = effectEntries.getByText('🪄 Channel the forge');
		const effect = effectEntries.getByText('Gain 2 Relics');
		const subAction = effectEntries.getByText('Summon guardian golem');
		const firstChange = effectEntries.getByText('Army +1');
		const secondChange = effectEntries.getByText('Fortification +1');
		const headlineContainer = headline.parentElement;
		const groupContainer = group.parentElement;
		const effectContainer = effect.parentElement;
		const subActionContainer = subAction.parentElement;
		const firstChangeContainer = firstChange.parentElement;
		const secondChangeContainer = secondChange.parentElement;

		if (
			!headlineContainer ||
			!groupContainer ||
			!effectContainer ||
			!subActionContainer ||
			!firstChangeContainer ||
			!secondChangeContainer
		) {
			throw new Error('Expected effect entries to have container elements');
		}

		expect(headlineContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(groupContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(effectContainer).toHaveStyle({ marginLeft: '1.75rem' });
		expect(subActionContainer).toHaveStyle({ marginLeft: '2.625rem' });
		expect(firstChangeContainer).toHaveStyle({ marginLeft: '3.5rem' });
		expect(secondChangeContainer).toHaveStyle({ marginLeft: '3.5rem' });
	});

	it('falls back to simple line rendering for phase resolutions without timeline data', () => {
		const resolution = createResolution({
			source: 'phase',
			visibleTimeline: [],
			visibleLines: [
				'Growth Phase begins',
				'   Gain +1 population',
				'   • Bonus: Gold +2',
				'      ↳ Triggered follow-up',
			],
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		expect(screen.queryByText('Cost')).toBeNull();
		expect(screen.queryByText('Effects')).toBeNull();

		const resolutionSteps = screen.getByText('Growth Phase begins');
		const firstLine = resolutionSteps.parentElement;
		const secondLine = screen.getByText('Gain +1 population').parentElement;
		const bonusLine = screen.getByText('Bonus: Gold +2').parentElement;
		const followUpLine = screen.getByText('Triggered follow-up').parentElement;

		if (!firstLine || !secondLine || !bonusLine || !followUpLine) {
			throw new Error('Expected fallback lines to be wrapped in elements');
		}

		expect(firstLine).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(secondLine).toHaveStyle({ marginLeft: '0.875rem' });
		expect(bonusLine).toHaveStyle({ marginLeft: '1.75rem' });
		expect(followUpLine).toHaveStyle({ marginLeft: '2.625rem' });
	});
});
