import { vi } from 'vitest';
import type { SessionAdapter } from '../../src/state/sessionTypes';
import type {
	SessionAdvanceResult,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';

const createFallbackPlayer = (
	sessionState: SessionSnapshot,
): SessionPlayerStateSnapshot => ({
	id: sessionState.game.activePlayerId,
	name: 'Player',
	resources: {},
	stats: {},
	resourceTouchedV2: {},
	population: {},
	lands: [],
	buildings: [],
	actions: [],
	resourceSources: {},
	skipPhases: {},
	skipSteps: {},
	passives: [],
});

const resolveReferencePlayer = (
	sessionState: SessionSnapshot,
): SessionPlayerStateSnapshot =>
	sessionState.game.players.find(
		(player) => player.id === sessionState.game.activePlayerId,
	) ??
	sessionState.game.players[0] ??
	createFallbackPlayer(sessionState);

const createAdvanceResult = (
	sessionState: SessionSnapshot,
	player: SessionPlayerStateSnapshot,
): SessionAdvanceResult => ({
	phase: sessionState.game.currentPhase,
	step: sessionState.game.currentStep,
	effects: [],
	player,
});

export function createMockSessionAdapter(
	sessionState: SessionSnapshot,
): SessionAdapter {
	const referencePlayer = resolveReferencePlayer(sessionState);
	return {
		enqueue: vi.fn(async <T>(task: () => Promise<T> | T) => await task()),
		getSnapshot: vi.fn(() => sessionState),
		getActionCosts: vi.fn(() => ({})),
		getActionRequirements: vi.fn(() => []),
		getActionOptions: vi.fn(() => []),
		getActionDefinition: vi.fn(() => undefined),
		readActionMetadata: vi.fn(() => ({})),
		subscribeActionMetadata: vi.fn(() => () => {}),
		runAiTurn: vi.fn(() => Promise.resolve(false)),
		hasAiController: vi.fn(() => false),
		simulateUpcomingPhases: vi.fn(() => ({
			playerId: referencePlayer.id,
			before: referencePlayer,
			after: referencePlayer,
			delta: { resources: {}, stats: {}, population: {} },
			steps: [],
		})),
		advancePhase: vi.fn(() =>
			createAdvanceResult(sessionState, referencePlayer),
		),
		setDevMode: vi.fn(),
		updatePlayerName: vi.fn(),
	};
}
