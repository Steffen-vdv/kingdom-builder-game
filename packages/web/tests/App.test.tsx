/** @vitest-environment jsdom */
import React from 'react';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
	SessionMetadataSnapshot,
	SessionMetadataSnapshotResponse,
} from '@kingdom-builder/protocol/session';
import type { AppNavigationState } from '../src/state/appNavigationState';
import { Screen } from '../src/state/appHistory';

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

const fetchMetadataSnapshotMock = vi.fn<
	[],
	Promise<SessionMetadataSnapshotResponse>
>();
vi.mock('../src/state/gameApiInstance', () => ({
	ensureGameApi: () => ({
		fetchMetadataSnapshot: fetchMetadataSnapshotMock,
	}),
}));

import App from '../src/App';
import { clearOverviewMetadataCache } from '../src/state/useOverviewMetadata';
import { createSessionRegistriesPayload } from './helpers/sessionRegistries';
import { createEmptySnapshotMetadata } from './helpers/sessionFixtures';

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
		isAutoAcknowledgeEnabled: false,
		isAutoPassEnabled: false,
		resumePoint: null,
		resumeSessionId: null,
		startStandardGame: vi.fn(),
		startDeveloperGame: vi.fn(),
		continueSavedGame: vi.fn(),
		openOverview: vi.fn(),
		openTutorial: vi.fn(),
		returnToMenu: vi.fn(),
		toggleDarkMode: vi.fn(),
		toggleMusic: vi.fn(),
		toggleSound: vi.fn(),
		toggleBackgroundAudioMute: vi.fn(),
		toggleAutoAcknowledge: vi.fn(),
		toggleAutoPass: vi.fn(),
		persistResumeSession: vi.fn(),
		clearResumeSession: vi.fn(),
		handleResumeSessionFailure: vi.fn(),
		...overrides,
	};
}

interface MetadataResponseSetup {
	response: SessionMetadataSnapshotResponse;
	heroTitle: string;
}

function createMetadataSnapshotResponse(
	heroTitle: string,
): MetadataResponseSetup {
	const registries = createSessionRegistriesPayload();
	const baseMetadata = createEmptySnapshotMetadata({
		overviewContent: {
			hero: { title: heroTitle, intro: 'Intro text.' },
			sections: [],
			tokens: {},
		},
	});
	const { passiveEvaluationModifiers: _ignored, ...metadata } = baseMetadata;
	return {
		response: {
			registries,
			metadata: metadata as SessionMetadataSnapshot,
		},
		heroTitle,
	};
}

beforeEach(() => {
	clearOverviewMetadataCache();
	fetchMetadataSnapshotMock.mockReset();
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

	it('shows loading state while overview metadata loads', () => {
		useAppNavigationMock.mockReturnValue(
			createNavigationState({ currentScreen: Screen.Overview }),
		);
		fetchMetadataSnapshotMock.mockImplementation(() => new Promise(() => {}));
		render(<App />);
		expect(screen.getByText('Loading overview details.')).toBeInTheDocument();
		expect(
			screen.getByText('This will only take a few moments.'),
		).toBeInTheDocument();
	});

	it('surfaces overview metadata errors with retry', async () => {
		const { response, heroTitle } =
			createMetadataSnapshotResponse('Recovered Title');
		useAppNavigationMock.mockReturnValue(
			createNavigationState({ currentScreen: Screen.Overview }),
		);
		const error = new Error('Service unavailable');
		fetchMetadataSnapshotMock
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce(response);
		render(<App />);
		const retryButton = await screen.findByRole('button', {
			name: 'Try again',
		});
		expect(screen.getByText(error.message)).toBeInTheDocument();
		fireEvent.click(retryButton);
		await waitFor(() => {
			expect(fetchMetadataSnapshotMock).toHaveBeenCalledTimes(2);
		});
		expect(await screen.findByText(heroTitle)).toBeInTheDocument();
	});

	it('renders overview once metadata arrives', async () => {
		const { response, heroTitle } =
			createMetadataSnapshotResponse('Glorious Realm');
		useAppNavigationMock.mockReturnValue(
			createNavigationState({ currentScreen: Screen.Overview }),
		);
		fetchMetadataSnapshotMock.mockResolvedValue(response);
		render(<App />);
		expect(await screen.findByText(heroTitle)).toBeInTheDocument();
	});

	it('renders continue CTA when resume point exists', () => {
		const continueSavedGame = vi.fn();
		const resumePoint = {
			sessionId: 'session-42',
			turn: 42,
			devMode: false,
			updatedAt: Date.now(),
		} as const;
		useAppNavigationMock.mockReturnValue(
			createNavigationState({ resumePoint, continueSavedGame }),
		);
		render(<App />);
		const formattedTurn = new Intl.NumberFormat().format(resumePoint.turn);
		const continueButton = screen.getByRole('button', {
			name: `Continue game (turn ${formattedTurn})`,
		});
		fireEvent.click(continueButton);
		expect(continueSavedGame).toHaveBeenCalledTimes(1);
	});
});
