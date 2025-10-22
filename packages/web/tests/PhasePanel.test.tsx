/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	render,
	screen,
	fireEvent,
	cleanup,
	within,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PhasePanel from '../src/components/phases/PhasePanel';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createPassiveGame } from './helpers/createPassiveDisplayGame';

function createPhasePanelScenario() {
	const scaffold = createTestSessionScaffold();
	const [activePlayer, opponent] = [
		createSnapshotPlayer({
			id: 'player-1',
			name: 'Player One',
		}),
		createSnapshotPlayer({
			id: 'player-2',
			name: 'Player Two',
		}),
	];
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
		turn: 3,
	});
	const { mockGame } = createPassiveGame(sessionState, {
		ruleSnapshot: scaffold.ruleSnapshot,
		registries: scaffold.registries,
		metadata: scaffold.metadata,
	});
	return {
		mockGame,
		sessionState,
		sessionView: selectSessionView(sessionState, scaffold.registries),
		currentPhaseLabel:
			sessionState.phases[sessionState.game.phaseIndex]?.label ??
			sessionState.game.currentPhase,
		defaultPhase: {
			currentPhaseId: sessionState.game.currentPhase,
			isActionPhase: Boolean(
				sessionState.phases[sessionState.game.phaseIndex]?.action,
			),
			canEndTurn: true,
			isAdvancing: false,
			awaitingManualStart: false,
			activePlayerId: activePlayer.id,
			activePlayerName: activePlayer.name,
			turnNumber: sessionState.game.turn,
		},
	};
}

let scenario = createPhasePanelScenario();
let mockGame = scenario.mockGame;
let currentPhaseLabel = scenario.currentPhaseLabel;
let defaultPhase = scenario.defaultPhase;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
	useOptionalGameEngine: () => mockGame,
}));

beforeEach(() => {
	scenario = createPhasePanelScenario();
	mockGame = scenario.mockGame;
	currentPhaseLabel = scenario.currentPhaseLabel;
	defaultPhase = scenario.defaultPhase;
	mockGame.phase = { ...defaultPhase };
	mockGame.requests.startSession.mockClear();
});

afterEach(() => {
	cleanup();
});

describe('<PhasePanel />', () => {
	it('displays the turn indicator and current phase badge', () => {
		render(<PhasePanel />);
		const turnLabel = screen.getByText('Turn', { selector: 'span' });
		expect(turnLabel).toBeInTheDocument();
		expect(
			within(turnLabel.parentElement as HTMLElement).getByText(
				String(mockGame.phase.turnNumber),
				{ selector: 'span' },
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				scenario.sessionView.active?.name ??
					mockGame.sessionSnapshot.game.players[0]?.name ??
					'Player',
			),
		).toBeInTheDocument();
		const phaseStatus = screen.getByRole('status');
		expect(phaseStatus).toHaveTextContent(/current phase/i);
		expect(phaseStatus).toHaveTextContent(currentPhaseLabel);
	});

	it('shows a manual start button when awaiting player confirmation', () => {
		mockGame.phase = {
			...defaultPhase,
			awaitingManualStart: true,
		};
		render(<PhasePanel />);
		const startButton = screen.getByRole('button', { name: /let's go!/i });
		expect(startButton).toBeEnabled();
		fireEvent.click(startButton);
		expect(mockGame.requests.startSession).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByRole('button', {
				name: /next turn/i,
			}),
		).not.toBeInTheDocument();
	});

	it('omits the Next Turn button when the phase can end', () => {
		mockGame.phase = {
			...defaultPhase,
			canEndTurn: true,
			isAdvancing: false,
		};
		render(<PhasePanel />);
		expect(
			screen.queryByRole('button', {
				name: /next turn/i,
			}),
		).not.toBeInTheDocument();
	});

	it('shows all phases with icons and highlights the active phase', () => {
		render(<PhasePanel />);
		const phaseDefinitions = mockGame.sessionSnapshot.phases;
		expect(screen.getAllByRole('listitem')).toHaveLength(
			phaseDefinitions.length,
		);
		const listItems = screen.getAllByRole('listitem');
		for (const phaseDefinition of phaseDefinitions) {
			const label = phaseDefinition.label ?? phaseDefinition.id;
			const labelMatches = listItems.filter((item) =>
				Boolean(within(item).queryByText(label)),
			);
			expect(labelMatches.length).toBeGreaterThan(0);
			const icon = phaseDefinition.icon?.trim();
			if (!icon) {
				continue;
			}
			expect(
				screen.getAllByText(icon, { selector: 'span' }).length,
			).toBeGreaterThan(0);
		}
		const activeItem = screen.getByRole('listitem', { current: 'step' });
		expect(activeItem).toHaveAttribute('data-active', 'true');
		const activeLabel =
			phaseDefinitions.find(
				(phaseDefinition) =>
					phaseDefinition.id === mockGame.phase.currentPhaseId,
			)?.label ?? mockGame.phase.currentPhaseId;
		expect(activeItem).toHaveTextContent(activeLabel);
	});
});

it('renders the phase active player when it differs from the session view', () => {
	mockGame.phase = {
		...defaultPhase,
		activePlayerId: scenario.sessionState.game.opponentId,
		activePlayerName:
			scenario.sessionState.game.players[1]?.name ?? 'Player Two',
	};
	render(<PhasePanel />);
	expect(screen.getByText('Player Two')).toBeInTheDocument();
});
