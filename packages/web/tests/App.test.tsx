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
				onOverview={vi.fn()}
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
