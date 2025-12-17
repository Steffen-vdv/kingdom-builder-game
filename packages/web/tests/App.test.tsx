/** @vitest-environment jsdom */
import React from 'react';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { AppNavigationState } from '../src/state/appNavigationState';
import { Screen } from '../src/state/appHistory';
import { CallToActionSection } from '../src/menu/CallToActionSection';
import type { ResumeSessionRecord } from '../src/state/sessionResumeStorage';

vi.mock('../src/components/audio/BackgroundMusic', () => ({
	default: () => null,
}));

const useAppNavigationMock = vi.fn();
vi.mock('../src/state/useAppNavigation', () => ({
	useAppNavigation: () => useAppNavigationMock(),
}));

const usePlayerIdentityMock = vi.fn();
vi.mock('../src/state/playerIdentity', () => ({
	usePlayerIdentity: () => usePlayerIdentityMock(),
}));

import App from '../src/App';

function createNavigationState(
	overrides: Partial<AppNavigationState> = {},
): AppNavigationState {
	return {
		currentScreen: Screen.Menu,
		currentGameKey: 0,
		isDarkMode: false,
		isDevMode: false,
		isMusicEnabled: false,
		isSoundEnabled: false,
		isBackgroundAudioMuted: false,
		isAutoAdvanceEnabled: false,
		resumePoint: null,
		resumeSessionId: null,
		startStandardGame: vi.fn(),
		startDeveloperGame: vi.fn(),
		continueSavedGame: vi.fn(),
		openTutorial: vi.fn(),
		returnToMenu: vi.fn(),
		toggleDarkMode: vi.fn(),
		toggleMusic: vi.fn(),
		toggleSound: vi.fn(),
		toggleBackgroundAudioMute: vi.fn(),
		toggleAutoAdvance: vi.fn(),
		persistResumeSession: vi.fn(),
		clearResumeSession: vi.fn(),
		handleResumeSessionFailure: vi.fn(),
		...overrides,
	};
}

function createResumePoint(
	overrides: Partial<ResumeSessionRecord> = {},
): ResumeSessionRecord {
	return {
		sessionId: 'session-id',
		turn: 3,
		devMode: false,
		updatedAt: Date.now(),
		...overrides,
	};
}

beforeEach(() => {
	useAppNavigationMock.mockReset();
	usePlayerIdentityMock.mockReset();
	useAppNavigationMock.mockReturnValue(createNavigationState());
	usePlayerIdentityMock.mockReturnValue({
		playerName: 'Player',
		hasStoredName: false,
		setPlayerName: vi.fn(),
		clearStoredName: vi.fn(),
	});
});

describe('<App />', () => {
	it('renders main menu', () => {
		render(<App />);
		expect(screen.getByText('Kingdom Builder')).toBeInTheDocument();
		expect(screen.getByText('Start New Game')).toBeInTheDocument();
		expect(screen.getByText('Start Dev/Debug Game')).toBeInTheDocument();
	});

	it('surfaces continue button when resume point exists', () => {
		const continueSavedGame = vi.fn();
		const resumePoint = createResumePoint({ turn: 7 });
		useAppNavigationMock.mockReturnValue(
			createNavigationState({
				resumePoint,
				continueSavedGame,
			}),
		);
		render(<App />);
		const continueButton = screen.getByRole('button', {
			name: 'Continue game (turn 7)',
		});
		fireEvent.click(continueButton);
		expect(continueSavedGame).toHaveBeenCalledTimes(1);
	});
});

describe('<CallToActionSection />', () => {
	it('renders continue button for stored session and invokes handler', () => {
		const onContinue = vi.fn();
		render(
			<CallToActionSection
				onStart={vi.fn()}
				onStartDev={vi.fn()}
				resumePoint={createResumePoint({ turn: 0 })}
				onContinue={onContinue}
				onTutorial={vi.fn()}
				onOpenSettings={vi.fn()}
			/>,
		);
		const continueButton = screen.getByRole('button', {
			name: 'Continue game (turn 1)',
		});
		fireEvent.click(continueButton);
		expect(onContinue).toHaveBeenCalledTimes(1);
	});
});
