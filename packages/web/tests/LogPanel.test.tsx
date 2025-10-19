/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import LogPanel from '../src/components/LogPanel';
import type { GameEngineContextValue } from '../src/state/GameContext.types';
import type { ActionResolution } from '../src/state/useActionResolution';
import type { ResolutionLogEntry } from '../src/state/useGameLog';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';

type MockGame = Pick<
	GameEngineContextValue,
	'log' | 'logOverflowed' | 'sessionSnapshot'
>;

let mockGame: MockGame;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

beforeAll(() => {
	if (!('scrollTo' in HTMLElement.prototype)) {
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
			value: vi.fn(),
			configurable: true,
		});
	}
	if (typeof ResizeObserver === 'undefined') {
		class MockResizeObserver {
			observe() {}
			disconnect() {}
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(globalThis as any).ResizeObserver = MockResizeObserver;
	}
});

afterEach(() => {
	cleanup();
});

function createSessionSnapshot(): SessionSnapshot {
	const playerA = {
		id: 'player-1',
		name: 'Player One',
		resources: {},
		stats: {},
		statsHistory: {},
		population: {},
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	};
	const playerB = {
		id: 'player-2',
		name: 'Player Two',
		resources: {},
		stats: {},
		statsHistory: {},
		population: {},
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	};
	return {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: 'phase-0',
			currentStep: 'phase-0-step',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
		},
		phases: [],
		actionCostResource: 'resource',
		recentResourceGains: [],
		compensations: {
			[playerA.id]: {},
			[playerB.id]: {},
		},
		rules: {} as SessionSnapshot['rules'],
		passiveRecords: {
			[playerA.id]: [],
			[playerB.id]: [],
		},
		metadata: { passiveEvaluationModifiers: {} },
	} as SessionSnapshot;
}

function createResolution(): ActionResolution {
	const timeline = [
		{ text: '🏗️ Develop', depth: 0, kind: 'headline' },
		{ text: '💲 Action cost', depth: 1, kind: 'cost' },
		{ text: 'Gold -3', depth: 2, kind: 'cost-detail' },
		{ text: '🪄 Effect happens', depth: 1, kind: 'change' },
	];
	return {
		lines: ['Played Test Action'],
		visibleLines: [],
		timeline,
		visibleTimeline: timeline,
		isComplete: true,
		summaries: [],
		source: 'action',
		requireAcknowledgement: false,
		player: { id: 'player-1', name: 'Player One' },
		action: { id: 'action-1', name: 'Test Action', icon: '⚔️' },
	} as ActionResolution;
}

describe('<LogPanel />', () => {
	it('renders resolution entries with timeline content', () => {
		const sessionSnapshot = createSessionSnapshot();
		const resolution = createResolution();
		const entry: ResolutionLogEntry = {
			id: 1,
			time: '10:00:00',
			playerId: 'player-1',
			kind: 'resolution',
			resolution,
		};
		mockGame = {
			log: [entry],
			logOverflowed: false,
			sessionSnapshot,
		};

		render(<LogPanel isOpen onClose={() => {}} />);

		const logEntry = document.getElementById('game-log-entry-1');
		expect(logEntry).not.toBeNull();
		if (!logEntry) {
			throw new Error('Expected log entry element');
		}

		expect(within(logEntry).getByText('10:00:00')).toBeInTheDocument();
		expect(within(logEntry).getByText('Resolution steps')).toBeInTheDocument();
		expect(within(logEntry).getByText('Cost')).toBeInTheDocument();
		expect(within(logEntry).getByText('Effects')).toBeInTheDocument();
		expect(within(logEntry).getByText('Gold -3')).toBeInTheDocument();
		expect(within(logEntry).getByText('🪄 Effect happens')).toBeInTheDocument();

		const card = logEntry.querySelector('.log-entry-card');
		expect(card).toHaveClass('log-entry-a');
	});

	it('gracefully renders legacy text entries', () => {
		const sessionSnapshot = createSessionSnapshot();
		const entry = {
			id: 2,
			time: '11:00:00',
			playerId: 'player-2',
			kind: 'text' as const,
			text: '[Player Two] Legacy details',
		};
		mockGame = {
			log: [entry],
			logOverflowed: false,
			sessionSnapshot,
		};

		render(<LogPanel isOpen onClose={() => {}} />);

		const logEntry = document.getElementById('game-log-entry-2');
		expect(logEntry).not.toBeNull();
		if (!logEntry) {
			throw new Error('Expected legacy log entry element');
		}
		expect(within(logEntry).getByText('11:00:00')).toBeInTheDocument();
		expect(within(logEntry).getByText('Legacy log entry')).toBeInTheDocument();
		expect(
			within(logEntry).getByText('[Player Two] Legacy details'),
		).toBeInTheDocument();
		const card = logEntry.querySelector('.log-entry-card');
		expect(card).toHaveClass('log-entry-b');
	});
});
