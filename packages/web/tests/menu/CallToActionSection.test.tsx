/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CallToActionSection } from '../../src/menu/CallToActionSection';
import type { ResumeSessionRecord } from '../../src/state/sessionResumeStorage';

const TURN_LABEL_FORMATTER = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 0,
	useGrouping: true,
});

function createResumePoint(
	overrides: Partial<ResumeSessionRecord> = {},
): ResumeSessionRecord {
	return {
		sessionId: 'session-id',
		turn: 48,
		devMode: false,
		updatedAt: 0,
		...overrides,
	};
}

describe('CallToActionSection', () => {
	it('places the continue button ahead of starting options', () => {
		const resumePoint = createResumePoint({ turn: 2567 });
		const onContinue = vi.fn();
		render(
			<CallToActionSection
				onStart={vi.fn()}
				onStartDev={vi.fn()}
				onOverview={vi.fn()}
				onTutorial={vi.fn()}
				onOpenSettings={vi.fn()}
				resumePoint={resumePoint}
				onContinue={onContinue}
			/>,
		);
		const formattedTurn = TURN_LABEL_FORMATTER.format(resumePoint.turn);
		const continueButton = screen.getByRole('button', {
			name: `Continue game (turn ${formattedTurn})`,
		});
		const startButton = screen.getByRole('button', { name: 'Start New Game' });
		expect(startButton.previousElementSibling).toBe(continueButton);
		fireEvent.click(continueButton);
		expect(onContinue).toHaveBeenCalledTimes(1);
	});
});
