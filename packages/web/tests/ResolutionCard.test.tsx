/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { ResolutionCard } from '../src/components/ResolutionCard';
import type { ActionResolution } from '../src/state/useActionResolution';

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

	it('renders grouped cost and effect entries with nested structure', () => {
		const resolution = createResolution({
			action: {
				id: 'action-with-costs',
				name: 'Channel Arcana',
				icon: '🧙',
			},
			visibleTimeline: [
				{ text: '🧙 Channel Arcana', depth: 0, kind: 'headline' },
				{ text: '💲 Action cost', depth: 1, kind: 'cost' },
				{ text: 'Pay 3 Gold', depth: 2, kind: 'cost-detail' },
				{ text: 'Spend 1 Influence', depth: 3, kind: 'cost-detail' },
				{ text: '🪄 Conjured effects', depth: 1, kind: 'group' },
				{ text: 'Gain 2 Gold', depth: 2, kind: 'change' },
				{ text: 'Trigger a follow-up', depth: 3, kind: 'change' },
				{ text: 'Grant an enchantment', depth: 2, kind: 'effect' },
			],
			visibleLines: [],
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		const costHeader = screen.getByText('Cost');
		const costList = costHeader.nextElementSibling as HTMLElement | null;
		const effectsHeader = screen.getByText('Effects');
		const effectsList = effectsHeader.parentElement
			?.nextElementSibling as HTMLElement | null;

		if (!costList) {
			throw new Error('Expected the cost list to be rendered');
		}
		if (!effectsList) {
			throw new Error('Expected the effects list to be rendered');
		}

		expect(within(costList).getByText('💲 Action cost')).toBeInTheDocument();
		const primaryCostDetail = within(costList).getByText('Pay 3 Gold');
		const primaryCostWrapper = primaryCostDetail.closest('div[style]');
		expect(primaryCostWrapper).toHaveStyle('margin-left: 0.875rem');

		const nestedCostDetail = within(costList).getByText('Spend 1 Influence');
		const nestedCostWrapper = nestedCostDetail.closest('div[style]');
		expect(nestedCostWrapper).toHaveStyle('margin-left: 1.75rem');

		const effectGroup = within(effectsList).getByText('🪄 Conjured effects');
		const effectGroupWrapper = effectGroup.closest('div[style]');
		expect(effectGroupWrapper).toHaveStyle('margin-left: 0.875rem');

		const nestedEffect = within(effectsList).getByText('Trigger a follow-up');
		const nestedEffectWrapper = nestedEffect.closest('div[style]');
		expect(nestedEffectWrapper).toHaveStyle('margin-left: 2.625rem');

		const siblingEffect = within(effectsList).getByText('Grant an enchantment');
		const siblingEffectWrapper = siblingEffect.closest('div[style]');
		expect(siblingEffectWrapper).toHaveStyle('margin-left: 1.75rem');
	});

	it('renders fallback layout for simple phase-style lines', () => {
		const resolution = createResolution({
			source: 'phase',
			actorLabel: 'Growth Phase',
			visibleTimeline: [],
			visibleLines: [
				'Growth Phase summary',
				'   Rewards trigger',
				'   • Gain 2 Gold',
				'   • Gain 1 Happiness',
				'↳ Aftermath resolves',
			],
		});

		const { container } = render(
			<ResolutionCard resolution={resolution} onContinue={() => {}} />,
		);

		expect(screen.queryByText('Cost')).toBeNull();
		expect(screen.queryByText('Effects')).toBeNull();

		const stepsLabel = screen.getByText('Resolution steps');
		const fallbackList = stepsLabel.nextElementSibling as HTMLElement | null;

		if (!fallbackList) {
			throw new Error('Expected fallback resolution list to be rendered');
		}

		expect(
			within(fallbackList).getByText('Growth Phase summary'),
		).toBeInTheDocument();
		const rewardLine = within(fallbackList).getByText('Rewards trigger');
		expect(rewardLine.closest('div[style]')).toHaveStyle(
			'margin-left: 0.875rem',
		);

		const gainGoldLine = within(fallbackList).getByText('Gain 2 Gold');
		expect(gainGoldLine.closest('div[style]')).toHaveStyle(
			'margin-left: 1.75rem',
		);

		const aftermathLine = within(fallbackList).getByText('Aftermath resolves');
		expect(aftermathLine.closest('div[style]')).toHaveStyle(
			'margin-left: 0.875rem',
		);

		expect(container).toMatchSnapshot();
	});
});
