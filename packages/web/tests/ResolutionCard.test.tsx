/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { ResolutionCard } from '../src/components/ResolutionCard';
import type { ActionResolution } from '../src/state/useActionResolution';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

const LEADING_EMOJI_PATTERN =
	/^(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/u;
const TRAILING_PHASE_PATTERN = /\bPhase\b$/iu;

function resolvePhaseHeader(label: string | undefined) {
	if (!label) {
		return 'Phase resolution';
	}
	const sanitized = label
		.replace(LEADING_EMOJI_PATTERN, '')
		.replace(TRAILING_PHASE_PATTERN, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
	return sanitized ? `Phase - ${sanitized}` : 'Phase resolution';
}

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

		const expectedHeader = resolvePhaseHeader(resolution.source.label);
		expect(screen.getByText(expectedHeader)).toBeInTheDocument();
		const phasePlayerLabel = screen.getByLabelText('Player');
		expect(phasePlayerLabel).toHaveTextContent('Player Two');
	});

	it('shows the phase icon in the header when available', () => {
		const resolution = createResolution({
			lines: ['🌱 Growth Phase', '    Gain +2 population'],
			visibleLines: ['🌱 Growth Phase', '    Gain +2 population'],
			source: {
				kind: 'phase',
				label: '🌱 Growth Phase',
				name: 'Growth Phase',
				icon: '🌱',
			},
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		expect(screen.getByText('🌱')).toBeInTheDocument();
		expect(screen.queryByText('✦')).toBeNull();
	});

	it('omits the phase headline from the effects section', () => {
		const resolution = createResolution({
			visibleTimeline: [
				{ text: '🌱 Growth Phase', depth: 0, kind: 'headline' },
				{ text: 'Gain +2 population', depth: 1, kind: 'effect' },
			],
			visibleLines: [],
			source: {
				kind: 'phase',
				label: '🌱 Growth Phase',
				name: 'Growth Phase',
				icon: '🌱',
			},
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		const effectsLabel = screen.getByText('🪄 Effects');
		const effectsContainer = effectsLabel.parentElement;
		if (!effectsContainer) {
			throw new Error('Expected effects label to have a parent element');
		}
		const effectsList = effectsContainer.parentElement;
		if (!effectsList) {
			throw new Error('Expected effects container to have a parent element');
		}
		expect(within(effectsList).queryByText('🌱 Growth Phase')).toBeNull();
		expect(
			within(effectsList).getByText('Gain +2 population'),
		).toBeInTheDocument();
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

	it('renders section roots with nested cost and effect entries', () => {
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

		const costSection = screen.getByText('💲 Cost');
		const effectsSection = screen.getByText('🪄 Effects');
		const costSectionContainer = costSection.parentElement;
		const effectsSectionContainer = effectsSection.parentElement;
		const goldCost = screen.getByText('Gold -3');
		const goldCostContainer = goldCost.parentElement;
		const effectHeadline = screen.getByText('🏗️ Develop');
		const effectEntry = screen.getByText('🪄 Effect happens');
		const effectHeadlineContainer = effectHeadline.parentElement;
		const effectEntryContainer = effectEntry.parentElement;

		if (
			!costSectionContainer ||
			!effectsSectionContainer ||
			!goldCostContainer ||
			!effectHeadlineContainer ||
			!effectEntryContainer
		) {
			throw new Error('Expected timeline entries to have container elements');
		}

		expect(costSectionContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(screen.queryByText('💲 Action cost')).toBeNull();
		expect(goldCostContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(effectsSectionContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(effectHeadlineContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(effectEntryContainer).toHaveStyle({ marginLeft: '1.75rem' });
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

		const costSection = screen.getByText('💲 Cost');
		const effectsSection = screen.getByText('🪄 Effects');
		const costSectionContainer = costSection.parentElement;
		const effectsSectionContainer = effectsSection.parentElement;

		const goldCost = screen.getByText('Gold -3');
		const discountGroup = screen.getByText('Discounts applied');
		const happinessCost = screen.getByText('Happiness -1');
		const goldCostContainer = goldCost.parentElement;
		const discountContainer = discountGroup.parentElement;
		const happinessContainer = happinessCost.parentElement;

		if (
			!costSectionContainer ||
			!effectsSectionContainer ||
			!goldCostContainer ||
			!discountContainer ||
			!happinessContainer
		) {
			throw new Error(
				'Expected cost section entries to have container elements',
			);
		}

		expect(costSectionContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(screen.queryByText('💲 Action cost')).toBeNull();
		expect(goldCostContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(discountContainer).toHaveStyle({ marginLeft: '1.75rem' });
		expect(happinessContainer).toHaveStyle({ marginLeft: '2.625rem' });

		expect(screen.queryByText('🛠️ Forge Relic')).toBeNull();

		const group = screen.getByText('🪄 Channel the forge');
		const effect = screen.getByText('Gain 2 Relics');
		const subAction = screen.getByText('Summon guardian golem');
		const firstChange = screen.getByText('Army +1');
		const secondChange = screen.getByText('Fortification +1');
		const groupContainer = group.parentElement;
		const effectContainer = effect.parentElement;
		const subActionContainer = subAction.parentElement;
		const firstChangeContainer = firstChange.parentElement;
		const secondChangeContainer = secondChange.parentElement;

		if (
			!groupContainer ||
			!effectContainer ||
			!subActionContainer ||
			!firstChangeContainer ||
			!secondChangeContainer
		) {
			throw new Error('Expected effect entries to have container elements');
		}

		expect(effectsSectionContainer).not.toHaveStyle({ marginLeft: '0.875rem' });
		expect(groupContainer).toHaveStyle({ marginLeft: '0.875rem' });
		expect(effectContainer).toHaveStyle({ marginLeft: '1.75rem' });
		expect(subActionContainer).toHaveStyle({ marginLeft: '2.625rem' });
		expect(firstChangeContainer).toHaveStyle({ marginLeft: '3.5rem' });
		expect(secondChangeContainer).toHaveStyle({ marginLeft: '3.5rem' });
	});

	it('normalizes modifier descriptions in structured timelines', () => {
		const resolution = createResolution({
			visibleTimeline: [
				{
					text: '✨ result on Raid: Whenever it resolves, 🎯 +1',
					depth: 1,
					kind: 'effect',
				},
				{
					text: '💲 cost on all actions: Increase cost by +3',
					depth: 1,
					kind: 'effect',
				},
			],
			visibleLines: [],
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		expect(
			screen.getByText('✨ modifier on Raid: Whenever it resolves, 🎯 +1'),
		).toBeInTheDocument();
		expect(
			screen.getByText('💲 modifier on all actions: Increase cost by +3'),
		).toBeInTheDocument();
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

	it('normalizes modifier descriptions in fallback lines', () => {
		const resolution = createResolution({
			visibleTimeline: [],
			visibleLines: [
				'✨ result on Raid: Whenever it resolves, 🎯 +1',
				'   💲 cost on all actions: Increase cost by +3',
			],
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		expect(
			screen.getByText('✨ modifier on Raid: Whenever it resolves, 🎯 +1'),
		).toBeInTheDocument();
		expect(
			screen.getByText('💲 modifier on all actions: Increase cost by +3'),
		).toBeInTheDocument();
	});
});
