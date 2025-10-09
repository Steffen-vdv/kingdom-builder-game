/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
		source: { kind: 'action', label: 'Action' },
		...overrides,
	} as ActionResolution;
}

describe('<ResolutionCard />', () => {
	it('shows labels for action-based resolutions', () => {
		const resolution = createResolution({
			action: {
				id: 'action-id',
				name: 'Test Action',
			},
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
		expect(screen.getByText('Played by Player One')).toBeInTheDocument();
	});

	it('renders custom source metadata when provided', () => {
		const resolution = createResolution({
			source: { kind: 'phase', label: 'Phase', name: 'Growth Phase' },
			actorLabel: 'Growth Phase',
			player: {
				id: 'player-2',
				name: 'Player Two',
			},
		});

		render(<ResolutionCard resolution={resolution} onContinue={() => {}} />);

		expect(screen.getByText('Phase - Growth Phase')).toBeInTheDocument();
		expect(screen.getByText('Phase owner Player Two')).toBeInTheDocument();
	});
});
