/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import type { ActionResolution } from '../../state/useActionResolution';
import { ResolutionCard } from '../ResolutionCard';

describe('ResolutionCard', () => {
	function createResolution(
		overrides: Partial<ActionResolution> = {},
	): ActionResolution {
		const base: ActionResolution = {
			lines: ['Line 1', 'Line 2'],
			visibleLines: ['Line 1', 'Line 2'],
			isComplete: true,
			summaries: ['Summary 1'],
			source: 'action',
		};
		return { ...base, ...overrides };
	}

	it('renders action-derived source and actor labels', () => {
		const resolution = createResolution({
			source: 'action',
			action: { id: 'action-1', name: 'Test Action', icon: '⚔️' },
			player: { id: 'A', name: 'Test Player' },
		});
		render(
			<ResolutionCard
				title="Resolution"
				resolution={resolution}
				onContinue={vi.fn()}
			/>,
		);

		expect(screen.getByText('Action - Test Action')).toBeInTheDocument();
		expect(screen.getByText('Source: Action')).toBeInTheDocument();
		expect(screen.getByText('Player: Test Player')).toBeInTheDocument();
	});

	it('renders custom source metadata when provided', () => {
		const resolution = createResolution({
			source: 'phase',
			actorLabel: 'Growth Phase',
			player: { id: 'B', name: 'Another Player' },
		});
		render(
			<ResolutionCard
				title="Resolution"
				resolution={resolution}
				onContinue={vi.fn()}
			/>,
		);

		expect(screen.getByText('Phase - Growth Phase')).toBeInTheDocument();
		expect(screen.getByText('Source: Phase')).toBeInTheDocument();
		expect(screen.getByText('Player: Another Player')).toBeInTheDocument();
	});
});
