/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import type {
	SessionMetadataSnapshot,
	SessionMetadataSnapshotResponse,
} from '@kingdom-builder/protocol/session';
import App from '../src/App';
import { resetOverviewMetadataCacheForTesting } from '../src/state/useOverviewMetadata';
import { createSessionRegistriesPayload } from './helpers/sessionRegistries';
import { createEmptySnapshotMetadata } from './helpers/sessionFixtures';
import { Screen } from '../src/state/appHistory';
import type { AppNavigationState } from '../src/state/appNavigationState';

vi.mock('../src/components/audio/BackgroundMusic', () => ({
	__esModule: true,
	default: () => null,
}));

const fetchMetadataSnapshot = vi.fn<
	[],
	Promise<SessionMetadataSnapshotResponse>
>();

vi.mock('../src/state/gameApiInstance', () => ({
	ensureGameApi: () => ({
		fetchMetadataSnapshot,
	}),
}));

let navigationState: AppNavigationState;

const createNavigationState = (): AppNavigationState => ({
	currentScreen: Screen.Overview,
	currentGameKey: 0,
	isDarkMode: false,
	isDevMode: false,
	isMusicEnabled: true,
	isSoundEnabled: true,
	isBackgroundAudioMuted: false,
	isAutoAcknowledgeEnabled: false,
	isAutoPassEnabled: false,
	startStandardGame: vi.fn(),
	startDeveloperGame: vi.fn(),
	openOverview: vi.fn(),
	openTutorial: vi.fn(),
	returnToMenu: vi.fn(),
	toggleDarkMode: vi.fn(),
	toggleMusic: vi.fn(),
	toggleSound: vi.fn(),
	toggleBackgroundAudioMute: vi.fn(),
	toggleAutoAcknowledge: vi.fn(),
	toggleAutoPass: vi.fn(),
});

vi.mock('../src/state/useAppNavigation', () => ({
	useAppNavigation: () => navigationState,
}));

const createSnapshotResponse = (
	heroTitle: string,
): SessionMetadataSnapshotResponse => {
	const metadata = createEmptySnapshotMetadata({
		assets: {
			land: { label: 'Land', icon: '🗺️' },
			slot: { label: 'Slot', icon: '🧩' },
			passive: { label: 'Passive', icon: '✨' },
		},
		overview: {
			hero: {
				title: heroTitle,
				paragraph: 'An overview of the realm.',
			},
			sections: [],
		},
	});
	const snapshot: SessionMetadataSnapshot = {
		resources: metadata.resources,
		populations: metadata.populations,
		buildings: metadata.buildings,
		developments: metadata.developments,
		stats: metadata.stats,
		phases: metadata.phases,
		triggers: metadata.triggers,
		assets: metadata.assets,
		overview: metadata.overview,
	};
	return {
		registries: createSessionRegistriesPayload(),
		metadata: snapshot,
	};
};

beforeEach(() => {
	resetOverviewMetadataCacheForTesting();
	fetchMetadataSnapshot.mockReset();
	navigationState = createNavigationState();
});

describe('<App /> overview metadata', () => {
	it('shows a loading state when the overview metadata request is pending', async () => {
		const pending = new Promise<SessionMetadataSnapshotResponse>(() => {});
		fetchMetadataSnapshot.mockReturnValueOnce(pending);
		render(<App />);
		await expect(
			screen.findByText('Contacting the game service.'),
		).resolves.toBeInTheDocument();
	});

	it('renders the overview screen after metadata loads', async () => {
		fetchMetadataSnapshot.mockResolvedValueOnce(
			createSnapshotResponse('Realm Overview'),
		);
		render(<App />);
		await expect(
			screen.findByRole('heading', { name: 'Realm Overview' }),
		).resolves.toBeInTheDocument();
	});

	it('allows retrying when the metadata request fails', async () => {
		fetchMetadataSnapshot.mockRejectedValueOnce(new Error('network error'));
		fetchMetadataSnapshot.mockResolvedValueOnce(
			createSnapshotResponse('Royal Archives'),
		);
		render(<App />);
		await expect(
			screen.findByText('An unexpected error prevented the game from loading.'),
		).resolves.toBeInTheDocument();
		const retryButton = await screen.findByRole('button', {
			name: /try again/i,
		});
		await act(async () => {
			fireEvent.click(retryButton);
		});
		await expect(
			screen.findByRole('heading', { name: 'Royal Archives' }),
		).resolves.toBeInTheDocument();
		expect(fetchMetadataSnapshot).toHaveBeenCalledTimes(2);
	});
});
