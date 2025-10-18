/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

		expect(screen.getByText('Action - Played by')).toBeInTheDocument();
		expect(screen.getByText('Played by Player One')).toBeInTheDocument();
		expect(screen.queryByText('Current phase')).toBeNull();
	});

	it('renders custom source metadata when provided', () => {
		const resolution = createResolution({
			source: {
				kind: 'phase',
				label: 'Phase',
				name: 'Growth Phase',
				icon: '🌙',
			},
			actorLabel: 'Growth Phase',
			player: {
				id: 'player-2',
				name: 'Player Two',
			},
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		expect(screen.getByText('Phase - Growth Phase')).toBeInTheDocument();
		expect(screen.getByText('Phase owner Player Two')).toBeInTheDocument();
		const currentPhaseLabel = screen.getByText('Current phase');
		expect(currentPhaseLabel).toBeInTheDocument();
		const phaseBadge = currentPhaseLabel.parentElement?.parentElement;
		expect(phaseBadge?.textContent ?? '').toContain('🌙');
		const textContent = phaseBadge?.textContent ?? '';
		const iconIndex = textContent.indexOf('🌙');
		const nameIndex = textContent.indexOf('Growth Phase');
		expect(iconIndex).toBeGreaterThanOrEqual(0);
		expect(nameIndex).toBeGreaterThan(iconIndex);
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
});
