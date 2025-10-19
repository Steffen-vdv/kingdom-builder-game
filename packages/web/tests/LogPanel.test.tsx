/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { ActionResolution } from '../src/state/useActionResolution';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';
import LogPanel from '../src/components/LogPanel';
import { useGameEngine } from '../src/state/GameContext';

vi.mock('../src/state/GameContext', async () => {
	const actual = await vi.importActual('../src/state/GameContext');
	return {
		...actual,
		useGameEngine: vi.fn(),
	};
});

vi.mock('../src/utils/useAutoAnimate', () => ({
	useAnimate: () => ({ current: null }),
}));

function createResolution(
	overrides: Partial<ActionResolution>,
): ActionResolution {
	return {
		lines: ['🛠️ Forge Relic', 'Gold -3', 'Gain 2 Relics'],
		visibleLines: [],
		timeline: [],
		visibleTimeline: [],
		isComplete: true,
		summaries: [],
		source: 'action',
		requireAcknowledgement: false,
		player: {
			id: 'player-1',
			name: 'Player One',
		},
		...overrides,
	} as ActionResolution;
}

const mockUseGameEngine = useGameEngine as unknown as Mock;

class MockResizeObserver {
	observe() {}
	disconnect() {}
}

describe('<LogPanel />', () => {
	beforeEach(() => {
		mockUseGameEngine.mockReset();
		// @ts-expect-error jsdom global augmentation for tests
		global.ResizeObserver = MockResizeObserver;
	});

	afterEach(() => {
		cleanup();
	});

	it('renders logged resolutions with the resolution card layout', () => {
		const visibleTimeline: ActionLogLineDescriptor[] = [
			{ text: '🛠️ Forge Relic', depth: 0, kind: 'headline' },
			{ text: '💲 Action cost', depth: 1, kind: 'cost' },
			{ text: 'Gold -3', depth: 2, kind: 'cost-detail' },
			{ text: '🪄 Channel the forge', depth: 1, kind: 'group' },
			{ text: 'Gain 2 Relics', depth: 2, kind: 'effect' },
		];
		const resolution = createResolution({
			visibleTimeline,
			timeline: visibleTimeline,
		});
		const sessionSnapshot = {
			game: {
				activePlayerId: 'player-1',
				players: [
					{ id: 'player-1', name: 'Player One' },
					{ id: 'player-2', name: 'Player Two' },
				],
			},
		} as unknown as SessionSnapshot;

		mockUseGameEngine.mockReturnValue({
			log: [
				{
					id: 1,
					time: '10:15:00 AM',
					playerId: 'player-1',
					kind: 'resolution' as const,
					resolution,
				},
			],
			logOverflowed: false,
			sessionSnapshot,
		});

		render(<LogPanel isOpen onClose={() => {}} />);

		expect(screen.getByText('Log')).toBeInTheDocument();
		expect(screen.getByText('10:15:00 AM')).toBeInTheDocument();
		expect(screen.getByText('Cost')).toBeInTheDocument();
		expect(screen.getByText('Effects')).toBeInTheDocument();
		expect(screen.getByText('Gold -3')).toBeInTheDocument();
		expect(screen.getByText('Gain 2 Relics')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
	});

	it('falls back to rendering legacy text entries', () => {
		const sessionSnapshot = {
			game: {
				activePlayerId: 'player-1',
				players: [
					{ id: 'player-1', name: 'Player One' },
					{ id: 'player-2', name: 'Player Two' },
				],
			},
		} as unknown as SessionSnapshot;

		mockUseGameEngine.mockReturnValue({
			log: [
				{
					id: 2,
					time: '11:00:00 AM',
					playerId: 'player-2',
					kind: 'text' as const,
					text: '[Player Two] performed a legacy action',
				},
			],
			logOverflowed: false,
			sessionSnapshot,
		});

		render(<LogPanel isOpen onClose={() => {}} />);

		expect(
			screen.getByText('[Player Two] performed a legacy action'),
		).toBeInTheDocument();
	});
});
