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
import type { EngineSession } from '@kingdom-builder/engine';
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
	mockGame.session = {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	} as unknown as EngineSession;
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
		},
	};
}

let scenario = createPhasePanelScenario();
let mockGame = scenario.mockGame;
let currentPhaseLabel = scenario.currentPhaseLabel;
let defaultPhase = scenario.defaultPhase;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

beforeEach(() => {
	scenario = createPhasePanelScenario();
	mockGame = scenario.mockGame;
	currentPhaseLabel = scenario.currentPhaseLabel;
	defaultPhase = scenario.defaultPhase;
	mockGame.phase = { ...defaultPhase };
	mockGame.handleEndTurn.mockClear();
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
				String(mockGame.sessionState.game.turn),
				{ selector: 'span' },
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				scenario.sessionView.active?.name ??
					mockGame.sessionState.game.players[0]?.name ??
					'Player',
			),
		).toBeInTheDocument();
		const phaseStatus = screen.getByRole('status');
		expect(phaseStatus).toHaveTextContent(/current phase/i);
		expect(phaseStatus).toHaveTextContent(currentPhaseLabel);
	});

	it('invokes the end turn handler when allowed', () => {
		mockGame.phase = {
			...defaultPhase,
			canEndTurn: true,
			isAdvancing: false,
		};
		render(<PhasePanel />);
		const nextTurnButton = screen.getByRole('button', {
			name: /next turn/i,
		});
		expect(nextTurnButton).toBeEnabled();
		fireEvent.click(nextTurnButton);
		expect(mockGame.handleEndTurn).toHaveBeenCalledTimes(1);
	});

	it('disables the Next Turn button when ending the turn is blocked', () => {
		mockGame.phase = {
			...defaultPhase,
			canEndTurn: false,
		};
		render(<PhasePanel />);
		expect(screen.getByRole('button', { name: /next turn/i })).toBeDisabled();
	});

	it('disables the Next Turn button while phases advance', () => {
		mockGame.phase = {
			...defaultPhase,
			isAdvancing: true,
		};
		render(<PhasePanel />);
		expect(screen.getByRole('button', { name: /next turn/i })).toBeDisabled();
	});

	it('shows all phases with icons and highlights the active phase', () => {
		render(<PhasePanel />);
		const phaseDefinitions = mockGame.sessionState.phases;
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
