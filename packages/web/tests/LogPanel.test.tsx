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
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import LogPanel from '../src/components/LogPanel';
import { ResolutionCard } from '../src/components/ResolutionCard';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createPassiveGame } from './helpers/createPassiveDisplayGame';
import type { GameEngineContextValue } from '../src/state/GameContext.types';
import type { ActionResolution } from '../src/state/useActionResolution';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';
import type { ResolutionLogEntry } from '../src/state/useGameLog';

interface ScenarioContext {
	players: ReturnType<typeof createSnapshotPlayer>[];
	resolution: ActionResolution;
	logEntry: ResolutionLogEntry;
}

const createResolution = (
	overrides: Partial<ActionResolution> = {},
): ActionResolution => ({
	lines: ['Heroic Deed'],
	visibleLines: ['Heroic Deed'],
	timeline: [],
	visibleTimeline: [],
	isComplete: true,
	summaries: [],
	source: 'action',
	requireAcknowledgement: false,
	...overrides,
});

let mockGame: GameEngineContextValue;
let scenario: ScenarioContext;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
	useOptionalGameEngine: () => mockGame,
}));

beforeAll(() => {
	if (typeof ResizeObserver === 'undefined') {
		class MockResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
		(
			globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }
		).ResizeObserver = MockResizeObserver;
	}
	if (typeof window.HTMLElement.prototype.scrollTo !== 'function') {
		Object.defineProperty(window.HTMLElement.prototype, 'scrollTo', {
			value: () => {},
			writable: true,
		});
	}
});

beforeEach(() => {
	const scaffold = createTestSessionScaffold();
	const resourceKeys = Object.keys(scaffold.registries.resources);
	const actionCostResource =
		resourceKeys[0] ?? scaffold.ruleSnapshot.tieredResourceKey;
	const players = [
		createSnapshotPlayer({ id: 'player-1', name: 'Player One' }),
		createSnapshotPlayer({ id: 'player-2', name: 'Player Two' }),
	];
	const sessionState = createSessionSnapshot({
		players,
		activePlayerId: players[0].id,
		opponentId: players[1].id,
		phases: scaffold.phases,
		actionCostResource,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
	});
	const { mockGame: passiveGame } = createPassiveGame(sessionState, {
		ruleSnapshot: scaffold.ruleSnapshot,
		registries: scaffold.registries,
		metadata: scaffold.metadata,
	});
	mockGame = passiveGame;
	const timeline: ActionLogLineDescriptor[] = [
		{ text: '🛡️ Heroic Deed', depth: 0, kind: 'headline' },
		{ text: '💲 Action cost', depth: 1, kind: 'cost' },
		{ text: '🪙 Gold -3', depth: 2, kind: 'cost-detail' },
		{ text: '🪄 Empower the realm', depth: 1, kind: 'effect' },
		{ text: 'Gain 2 Glory', depth: 2, kind: 'effect' },
	];
	const resolution = createResolution({
		action: { id: 'heroic-deed', name: 'Heroic Deed', icon: '🛡️' },
		player: { id: players[0].id, name: players[0].name },
		visibleTimeline: timeline,
		timeline,
		visibleLines: [],
	});
	const logEntry: ResolutionLogEntry = {
		id: 1,
		time: '10:00:00 AM',
		playerId: players[0].id,
		kind: 'resolution',
		resolution,
	};
	mockGame.log = [logEntry];
	mockGame.logOverflowed = false;
	scenario = { players, resolution, logEntry };
});

afterEach(() => {
	cleanup();
});

describe('<LogPanel />', () => {
	it('renders resolution log entries with the same markup as live resolutions', () => {
		const { resolution, logEntry } = scenario;
		const { container: liveContainer } = render(
			<ResolutionCard resolution={resolution} onContinue={() => {}} />,
		);
		const liveCard = liveContainer.querySelector('[data-state="enter"]');
		expect(liveCard).not.toBeNull();
		if (!liveCard) {
			throw new Error('Expected resolution card to render');
		}
		const liveMarkup = liveCard.outerHTML;
		cleanup();

		const { container: logContainer } = render(
			<LogPanel isOpen onClose={() => {}} />,
		);
		const logEntryNode = logContainer.querySelector(
			`[data-log-entry-id="${logEntry.id}"]`,
		);
		expect(logEntryNode).not.toBeNull();
		if (!logEntryNode) {
			throw new Error('Expected log entry to render');
		}
		const logCard = logEntryNode.querySelector('[data-state="enter"]');
		expect(logCard).not.toBeNull();
		if (!logCard) {
			throw new Error('Expected resolution card in log entry');
		}
		expect(logCard.outerHTML).toBe(liveMarkup);
		const header = logEntryNode.querySelector('[data-log-entry-header]');
		expect(header).not.toBeNull();
		if (!header) {
			throw new Error('Expected header element for log entry');
		}
		expect(header.textContent).toContain(logEntry.time);
		expect(header.textContent).toContain('Player One');
	});
});
