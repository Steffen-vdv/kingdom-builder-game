/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CallToActionSection } from '../../src/menu/CallToActionSection';

describe('<CallToActionSection />', () => {
	it('places continue CTA before new game and triggers handler', () => {
		const onStart = vi.fn();
		const onStartDev = vi.fn();
		const onContinue = vi.fn();
		const onOverview = vi.fn();
		const onTutorial = vi.fn();
		const onOpenSettings = vi.fn();
		const resumePoint = {
			sessionId: 'resume-123',
			turn: 128,
			devMode: false,
			updatedAt: Date.now(),
		} as const;
		render(
			<CallToActionSection
				onStart={onStart}
				onStartDev={onStartDev}
				onContinue={onContinue}
				onOverview={onOverview}
				onTutorial={onTutorial}
				onOpenSettings={onOpenSettings}
				resumePoint={resumePoint}
			/>,
		);
		const formattedTurn = new Intl.NumberFormat().format(resumePoint.turn);
		const continueButton = screen.getByRole('button', {
			name: `Continue game (turn ${formattedTurn})`,
		});
		const newGameButton = screen.getByRole('button', {
			name: 'Start New Game',
		});
		const relativePosition =
			continueButton.compareDocumentPosition(newGameButton);
		expect(relativePosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		fireEvent.click(continueButton);
		expect(onContinue).toHaveBeenCalledTimes(1);
		expect(onStart).not.toHaveBeenCalled();
		expect(onStartDev).not.toHaveBeenCalled();
	});
});
