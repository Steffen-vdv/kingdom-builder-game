/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { CallToActionSection } from '../../src/menu/CallToActionSection';

describe('<CallToActionSection />', () => {
	const defaultProps = {
		onStart: () => {},
		onStartDev: () => {},
		onOverview: () => {},
		onTutorial: () => {},
		onOpenSettings: () => {},
	} as const;

	it('does not render continue button without resume point', () => {
		render(
			<CallToActionSection
				{...defaultProps}
				resumePoint={null}
				onContinueSavedGame={() => {}}
			/>,
		);
		expect(
			screen.queryByRole('button', {
				name: /Continue game/i,
			}),
		).not.toBeInTheDocument();
	});

	it('renders continue button and triggers handler', () => {
		const handleContinue = vi.fn();
		render(
			<CallToActionSection
				{...defaultProps}
				resumePoint={{
					sessionId: 'session-123',
					turn: 34,
					devMode: true,
					updatedAt: 0,
				}}
				onContinueSavedGame={handleContinue}
			/>,
		);
		const continueButton = screen.getByRole('button', {
			name: 'Continue game (turn 34)',
		});
		fireEvent.click(continueButton);
		expect(handleContinue).toHaveBeenCalledTimes(1);
	});
});
