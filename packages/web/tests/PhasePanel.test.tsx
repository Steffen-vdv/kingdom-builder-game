/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PhasePanel from '../src/components/phases/PhasePanel';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from './helpers/sessionFixtures';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createPassiveGame } from './helpers/createPassiveDisplayGame';

type PhasePanelScenario = ReturnType<typeof createPhasePanelScenario>;

function createPhasePanelScenario() {
	const { registries, metadata, phases, ruleSnapshot } =
		createTestSessionScaffold();
	const activePlayer = createSnapshotPlayer({
		id: 'player-1',
		name: 'Player One',
	});
	const opponent = createSnapshotPlayer({
		id: 'player-2',
		name: 'Player Two',
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases,
		actionCostResource: ruleSnapshot.tieredResourceKey,
		ruleSnapshot,
		metadata,
	});
	const { mockGame } = createPassiveGame(sessionState, {
		registries,
		metadata,
		ruleSnapshot,
	});
	const defaultPhase = { ...mockGame.phase };
	const handleEndTurn = vi.fn().mockResolvedValue(undefined);
	mockGame.handleEndTurn = handleEndTurn;
	return {
		mockGame,
		sessionState,
		defaultPhase,
		handleEndTurn,
	};
}

let scenario: PhasePanelScenario;
let mockGame: PhasePanelScenario['mockGame'];

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

beforeEach(() => {
	scenario = createPhasePanelScenario();
	mockGame = scenario.mockGame;
	mockGame.phase = { ...scenario.defaultPhase };
	scenario.handleEndTurn.mockClear();
});

afterEach(() => {
	cleanup();
});

describe('<PhasePanel />', () => {
	it('displays the turn indicator and current phase badge', () => {
		render(<PhasePanel />);
		expect(
			screen.getByText(`Turn ${scenario.sessionState.game.turn}`),
		).toBeInTheDocument();
		const activeName =
			scenario.mockGame.sessionView.active?.name ??
			scenario.sessionState.game.players[0]?.name ??
			'Player';
		expect(screen.getByText(activeName)).toBeInTheDocument();
		const phaseBadge = screen.getByRole('status');
		expect(phaseBadge).toHaveTextContent('Current Phase');
		const expectedLabel =
			scenario.sessionState.phases[scenario.sessionState.game.phaseIndex]
				?.label ?? scenario.mockGame.phase.currentPhaseId;
		expect(phaseBadge).toHaveTextContent(expectedLabel);
	});

	it('invokes the end turn handler when allowed', () => {
		mockGame.phase = {
			...scenario.defaultPhase,
			canEndTurn: true,
			isAdvancing: false,
		};
		render(<PhasePanel />);
		const nextTurnButton = screen.getByRole('button', {
			name: /next turn/i,
		});
		expect(nextTurnButton).toBeEnabled();
		fireEvent.click(nextTurnButton);
		expect(scenario.handleEndTurn).toHaveBeenCalledTimes(1);
	});

	it('disables the Next Turn button when ending the turn is blocked', () => {
		mockGame.phase = {
			...scenario.defaultPhase,
			canEndTurn: false,
		};
		render(<PhasePanel />);
		expect(screen.getByRole('button', { name: /next turn/i })).toBeDisabled();
	});

	it('disables the Next Turn button while phases advance', () => {
		mockGame.phase = {
			...scenario.defaultPhase,
			isAdvancing: true,
		};
		render(<PhasePanel />);
		expect(screen.getByRole('button', { name: /next turn/i })).toBeDisabled();
	});
});
