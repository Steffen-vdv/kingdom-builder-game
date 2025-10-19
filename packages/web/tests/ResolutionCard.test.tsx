/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

	it('renders cost and effect section roots within a single list', () => {
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

		expect(screen.queryByText('Cost')).toBeNull();
		expect(screen.queryByText('Effects')).toBeNull();

		const costRoot = screen.getByText('💲 Cost');
		const costRootContainer = costRoot.closest('[data-timeline-entry]');
		const actionCost = screen.getByText('💲 Action cost');
		const actionCostContainer = actionCost.closest('[data-timeline-entry]');
		const goldCost = screen.getByText('Gold -3');
		const goldCostContainer = goldCost.closest('[data-timeline-entry]');
		const effectsRoot = screen.getByText('🪄 Effects');
		const effectsRootContainer = effectsRoot.closest('[data-timeline-entry]');
		const effectEntry = screen.getByText('🪄 Effect happens');
		const effectEntryContainer = effectEntry.closest('[data-timeline-entry]');

		if (
			!costRootContainer ||
			!actionCostContainer ||
			!goldCostContainer ||
			!effectsRootContainer ||
			!effectEntryContainer
		) {
			throw new Error('Expected timeline entries to have container elements');
		}

		expect(costRootContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(actionCostContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(goldCostContainer).toHaveStyle({ marginLeft: '1.75rem' });
		expect(effectsRootContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(effectEntryContainer).toHaveStyle({ marginLeft: '0.875rem' });
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

		const costRoot = screen.getByText('💲 Cost');
		const costRootContainer = costRoot.closest('[data-timeline-entry]');
		const actionCost = screen.getByText('💲 Action cost');
		const goldCost = screen.getByText('Gold -3');
		const discountGroup = screen.getByText('Discounts applied');
		const happinessCost = screen.getByText('Happiness -1');
		const effectsRoot = screen.getByText('🪄 Effects');
		const group = screen.getByText('🪄 Channel the forge');
		const effect = screen.getByText('Gain 2 Relics');
		const subAction = screen.getByText('Summon guardian golem');
		const firstChange = screen.getByText('Army +1');
		const secondChange = screen.getByText('Fortification +1');

		expect(screen.queryByText('🛠️ Forge Relic')).toBeNull();

		const actionCostContainer = actionCost.closest('[data-timeline-entry]');
		const goldCostContainer = goldCost.closest('[data-timeline-entry]');
		const discountContainer = discountGroup.closest('[data-timeline-entry]');
		const happinessContainer = happinessCost.closest('[data-timeline-entry]');
		const costRootParent = costRootContainer;
		const effectsRootContainer = effectsRoot.closest('[data-timeline-entry]');
		const groupContainer = group.closest('[data-timeline-entry]');
		const effectContainer = effect.closest('[data-timeline-entry]');
		const subActionContainer = subAction.closest('[data-timeline-entry]');
		const firstChangeContainer = firstChange.closest('[data-timeline-entry]');
		const secondChangeContainer = secondChange.closest('[data-timeline-entry]');

		if (
			!costRootParent ||
			!actionCostContainer ||
			!goldCostContainer ||
			!discountContainer ||
			!happinessContainer ||
			!effectsRootContainer ||
			!groupContainer ||
			!effectContainer ||
			!subActionContainer ||
			!firstChangeContainer ||
			!secondChangeContainer
		) {
			throw new Error('Expected timeline entries to have container elements');
		}

		expect(costRootParent).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(actionCostContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(goldCostContainer).toHaveStyle({ marginLeft: '1.75rem' });
		expect(discountContainer).toHaveStyle({ marginLeft: '2.625rem' });
		expect(happinessContainer).toHaveStyle({ marginLeft: '3.5rem' });

		expect(effectsRootContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
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

		expect(screen.queryByText('💲 Cost')).toBeNull();
		expect(screen.queryByText('🪄 Effects')).toBeNull();

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
