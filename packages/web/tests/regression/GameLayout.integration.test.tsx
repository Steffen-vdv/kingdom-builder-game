/** @vitest-environment jsdom */
import React from 'react';
import {
	render,
	screen,
	within,
	waitFor,
	cleanup,
	fireEvent,
	act,
} from '@testing-library/react';
import {
	describe,
	it,
	beforeEach,
	afterEach,
	beforeAll,
	afterAll,
	expect,
	vi,
} from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
	ActionId,
	PopulationRole,
	Resource,
	Stat,
} from '@kingdom-builder/contents';
import {
	type SessionAdvanceResponse,
	type SessionCreateResponse,
	type SessionRegistriesPayload,
	type SessionStateResponse,
} from '@kingdom-builder/protocol/session';
import { GameProvider, useGameEngine } from '../../src/state/GameContext';
import GameLayout from '../../src/GameLayout';
import { GameApiFake } from '../../src/services/gameApi.mocks';
import { setGameApi } from '../../src/state/sessionSdk';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

const originalScrollTo = (
	Element.prototype as { scrollTo?: typeof window.scrollTo }
).scrollTo;
let refreshSessionHandler: (() => Promise<void>) | null = null;

beforeAll(() => {
	Object.defineProperty(Element.prototype, 'scrollTo', {
		configurable: true,
		value: vi.fn(),
	});
});

afterAll(() => {
	if (originalScrollTo) {
		Object.defineProperty(Element.prototype, 'scrollTo', {
			configurable: true,
			value: originalScrollTo,
		});
		return;
	}
	delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
});

function TurnProbe() {
	const { sessionState, requests } = useGameEngine();
	refreshSessionHandler = requests.refreshSession;
	return <div data-testid="turn-indicator">turn:{sessionState.game.turn}</div>;
}

describe('<GameLayout /> integration', () => {
	const phases = [
		{
			id: 'phase-growth',
			name: 'Growth Phase',
			label: 'Growth',
			icon: '🌱',
			steps: [
				{
					id: 'phase-growth:start',
					name: 'Start Growth',
					title: 'Start Growth',
				},
			],
		},
		{
			id: 'phase-main',
			name: 'Main Phase',
			label: 'Main',
			icon: '🎯',
			action: true,
			steps: [
				{
					id: 'phase-main:start',
					name: 'Start Main',
					title: 'Main Phase',
				},
			],
		},
	] as const;
	const ruleSnapshot = {
		tieredResourceKey: Resource.happiness,
		tierDefinitions: [],
		winConditions: [],
	} as const;
	const registries: SessionRegistriesPayload = {
		actions: {},
		buildings: {},
		developments: {},
		populations: {},
		resources: {},
	};
	const metadata = {
		passiveEvaluationModifiers: {},
		effectLogs: { session: [] as unknown[] },
	};
	const sessionId = 'game-layout-session';
	let api: GameApiFake;
	let nextTurnSnapshot: ReturnType<typeof createSessionSnapshot>;

	beforeEach(() => {
		const player = createSnapshotPlayer({
			id: 'player-a',
			name: 'Commander',
			resources: {
				[Resource.gold]: 10,
				[Resource.ap]: 0,
				[Resource.happiness]: 0,
			},
			stats: { [Stat.maxPopulation]: 1 },
			population: {
				[PopulationRole.Council]: 1,
				[PopulationRole.Legion]: 0,
				[PopulationRole.Fortifier]: 0,
				[PopulationRole.Citizen]: 0,
			},
			actions: [ActionId.raise_pop],
		});
		const opponent = createSnapshotPlayer({
			id: 'player-b',
			name: 'Rival',
			resources: {
				[Resource.gold]: 8,
				[Resource.ap]: 0,
				[Resource.happiness]: 0,
			},
			stats: { [Stat.maxPopulation]: 1 },
			population: {
				[PopulationRole.Council]: 0,
				[PopulationRole.Legion]: 0,
				[PopulationRole.Fortifier]: 0,
				[PopulationRole.Citizen]: 0,
			},
			actions: [],
		});
		const initialSnapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource: Resource.ap,
			ruleSnapshot,
			currentPhase: phases[0].id,
			currentStep: phases[0].steps?.[0]?.id,
			phaseIndex: 0,
			stepIndex: 0,
			turn: 1,
			metadata,
			devMode: true,
		});
		const actionPhaseSnapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource: Resource.ap,
			ruleSnapshot,
			currentPhase: phases[1].id,
			currentStep: phases[1].steps?.[0]?.id,
			phaseIndex: 1,
			stepIndex: 0,
			turn: 1,
			metadata,
			devMode: true,
		});
		nextTurnSnapshot = createSessionSnapshot({
			players: [player, opponent],
			activePlayerId: player.id,
			opponentId: opponent.id,
			phases,
			actionCostResource: Resource.ap,
			ruleSnapshot,
			currentPhase: phases[1].id,
			currentStep: phases[1].steps?.[0]?.id,
			phaseIndex: 1,
			stepIndex: 0,
			turn: 2,
			metadata,
			devMode: true,
		});
		const createResponse: SessionCreateResponse = {
			sessionId,
			snapshot: initialSnapshot,
			registries,
		};
		const advanceToAction: SessionAdvanceResponse = {
			sessionId,
			snapshot: actionPhaseSnapshot,
			registries,
			advance: {
				phase: actionPhaseSnapshot.game.currentPhase,
				step: actionPhaseSnapshot.game.currentStep,
				effects: [],
				player: actionPhaseSnapshot.game.players[0],
			},
		};
		const stateResponse: SessionStateResponse = {
			sessionId,
			snapshot: initialSnapshot,
			registries,
		};
		api = new GameApiFake();
		api.setNextCreateResponse(createResponse);
		api.primeSession(stateResponse);
		api.setNextAdvanceResponse(advanceToAction);
		setGameApi(api);
	});

	afterEach(() => {
		cleanup();
		setGameApi(null);
		refreshSessionHandler = null;
	});

	it('renders actions, settings, and phase transitions', async () => {
		render(
			<GameProvider onExit={() => {}}>
				<>
					<GameLayout />
					<TurnProbe />
				</>
			</GameProvider>,
		);
		const hireCards = await screen.findAllByRole('button', { name: /Hire/i });
		const hireCard = hireCards[0];
		expect(within(hireCard).getByText(/^Req/)).toBeVisible();
		const showOpponentButton = await screen.findByRole('button', {
			name: 'Show opponent actions',
		});
		fireEvent.click(showOpponentButton);
		fireEvent.click(
			await screen.findByRole('button', { name: 'Show player actions' }),
		);
		const hireCardsAfterToggle = await screen.findAllByRole('button', {
			name: /Hire/i,
		});
		const hireCardAfterToggle = hireCardsAfterToggle[0];
		expect(within(hireCardAfterToggle).getByText(/^Req/)).toBeVisible();
		const settingsButton = await screen.findByRole('button', {
			name: 'Settings',
		});
		fireEvent.click(settingsButton);
		await screen.findByRole('heading', { name: 'Settings' });
		expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeVisible();
		const audioTab = await screen.findByRole('button', { name: 'Audio' });
		fireEvent.click(audioTab);
		expect(
			await screen.findByRole('switch', { name: 'Background music' }),
		).toBeVisible();
		expect(screen.getByRole('switch', { name: 'Game sounds' })).toBeVisible();
		expect(
			screen.getByRole('switch', { name: 'Play audio in background' }),
		).toBeVisible();
		fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		await waitFor(() => {
			expect(
				screen.queryByRole('heading', { name: 'Settings' }),
			).not.toBeInTheDocument();
		});
		const nextTurnButton = await screen.findByRole(
			'button',
			{ name: 'Next Turn' },
			{ timeout: 15000 },
		);
		await waitFor(() => {
			expect(nextTurnButton).not.toBeDisabled();
		});
		api.setNextAdvanceResponse({
			sessionId,
			snapshot: nextTurnSnapshot,
			registries,
			advance: {
				phase: nextTurnSnapshot.game.currentPhase,
				step: nextTurnSnapshot.game.currentStep,
				effects: [],
				player: nextTurnSnapshot.game.players[0],
			},
		});
		fireEvent.click(nextTurnButton);
		await act(async () => {
			if (refreshSessionHandler) {
				await refreshSessionHandler();
			}
		});
		await waitFor(
			() => {
				const turnLabel = screen.getByText(/^Turn/);
				expect(turnLabel.textContent ?? '').toContain('2');
				expect(screen.getByTestId('turn-indicator')).toHaveTextContent(
					'turn:2',
				);
			},
			{ timeout: 5000 },
		);
	}, 20000);
});
