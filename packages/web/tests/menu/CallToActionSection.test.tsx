/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CallToActionSection } from '../../src/menu/CallToActionSection';

describe('<CallToActionSection />', () => {
	it('prioritizes continue call-to-action when resume point is provided', () => {
		const handleContinue = vi.fn();
		render(
			<CallToActionSection
				onStart={vi.fn()}
				onStartDev={vi.fn()}
				onOverview={vi.fn()}
				onTutorial={vi.fn()}
				resumePoint={{
					sessionId: 'session-continue',
					turn: 12345,
					devMode: false,
					updatedAt: Date.now(),
				}}
				onContinue={handleContinue}
				onOpenSettings={vi.fn()}
			/>,
		);
		const continueButton = screen.getByRole('button', {
			name: 'Continue game (turn 12,345)',
		});
		fireEvent.click(continueButton);
		expect(handleContinue).toHaveBeenCalledTimes(1);
		expect(screen.getByText('Start New Game')).toBeInTheDocument();
	});
});
