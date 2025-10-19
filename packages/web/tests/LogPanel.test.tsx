/** @vitest-environment jsdom */
import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import LogPanel from '../src/components/LogPanel';
import { ResolutionCard } from '../src/components/ResolutionCard';
import type { ActionResolution } from '../src/state/useActionResolution';
import type { LogEntry } from '../src/state/useGameLog';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';

type MockGame = {
	log: LogEntry[];
	logOverflowed: boolean;
	sessionSnapshot: SessionSnapshot;
};

let mockGame: MockGame;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

beforeAll(() => {
	if (!HTMLElement.prototype.scrollTo) {
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
			configurable: true,
			value: () => {},
		});
	}
});

beforeEach(() => {
	const sessionSnapshot = {
		game: {
			players: [
				{ id: 'player-a', name: 'Player A' },
				{ id: 'player-b', name: 'Player B' },
			],
			activePlayerId: 'player-a',
			opponentId: 'player-b',
		},
	} as unknown as SessionSnapshot;
	mockGame = {
		log: [],
		logOverflowed: false,
		sessionSnapshot,
	};
});

afterEach(() => {
	cleanup();
});

describe('<LogPanel />', () => {
	it('renders resolution log entries using the ResolutionCard markup', () => {
		const resolution: ActionResolution = {
			lines: ['🛠️ Forge Relic'],
			visibleLines: ['🛠️ Forge Relic'],
			timeline: [
				{ text: '🛠️ Forge Relic', depth: 0, kind: 'headline' },
				{ text: '💲 Action cost', depth: 1, kind: 'cost' },
				{ text: 'Gold -3', depth: 2, kind: 'cost-detail' },
				{ text: '🪄 Channel the forge', depth: 1, kind: 'group' },
				{ text: 'Army +1', depth: 2, kind: 'change' },
			],
			visibleTimeline: [
				{ text: '🛠️ Forge Relic', depth: 0, kind: 'headline' },
				{ text: '💲 Action cost', depth: 1, kind: 'cost' },
				{ text: 'Gold -3', depth: 2, kind: 'cost-detail' },
				{ text: '🪄 Channel the forge', depth: 1, kind: 'group' },
				{ text: 'Army +1', depth: 2, kind: 'change' },
			],
			isComplete: true,
			summaries: [],
			source: 'action',
			requireAcknowledgement: false,
			player: { id: 'player-a', name: 'Player A' },
			action: { id: 'forge-relic', name: 'Forge Relic', icon: '🛠️' },
		} as ActionResolution;
		mockGame.log = [
			{
				id: 1,
				time: '10:15:00 AM',
				playerId: 'player-a',
				kind: 'resolution',
				resolution,
			},
		];

		const { getByTestId } = render(<LogPanel isOpen onClose={() => {}} />);
		const logCard = getByTestId('log-resolution-card-1');
		const loggedCard = logCard.firstElementChild as HTMLElement | null;
		const direct = render(
			<ResolutionCard resolution={resolution} onContinue={() => {}} />,
		);
		const directCard = direct.container.firstElementChild as HTMLElement | null;

		expect(loggedCard).not.toBeNull();
		expect(directCard).not.toBeNull();
		expect(loggedCard?.innerHTML).toBe(directCard?.innerHTML);
	});
});
