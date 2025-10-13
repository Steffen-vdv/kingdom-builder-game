import { vi } from 'vitest';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
	SessionAdvanceResult,
	SessionPlayerId,
	SessionSnapshot,
	SimulateUpcomingPhasesResult,
} from '@kingdom-builder/protocol/session';
import type { LegacySession } from '../../src/state/sessionTypes';

interface CreateLegacySessionMockOptions {
	snapshot?: SessionSnapshot;
	actionDefinition?: SessionActionDefinitionSummary | undefined;
	actionOptions?: ActionEffectGroup[];
	actionCosts?: SessionActionCostMap;
	actionRequirements?: SessionActionRequirementList;
	simulateResult?: SimulateUpcomingPhasesResult;
	advanceResult?: SessionAdvanceResult;
}

type LegacySessionOverrides = Partial<LegacySession>;

function createFallbackPlayer(id: SessionPlayerId) {
	return {
		id,
		name: `Player ${id}`,
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
	} satisfies SessionSnapshot['game']['players'][number];
}

function ensureSnapshot(snapshot?: SessionSnapshot): SessionSnapshot {
	if (snapshot) {
		return snapshot;
	}
	const primary = createFallbackPlayer('A');
	const opponent = createFallbackPlayer('B');
	return {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: 'phase:setup',
			currentStep: 'phase:setup:start',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players: [primary, opponent],
			activePlayerId: 'A',
			opponentId: 'B',
		},
		phases: [],
		actionCostResource: 'resource:action',
		recentResourceGains: [],
		compensations: { A: {}, B: {} },
		rules: {
			tieredResourceKey: 'resource:action',
			tierDefinitions: [],
			winConditions: [],
		},
		passiveRecords: { A: [], B: [] },
		metadata: { passiveEvaluationModifiers: {} },
	} satisfies SessionSnapshot;
}

function createSimulationResult(snapshot: SessionSnapshot) {
	const player = snapshot.game.players.find(
		(entry) => entry.id === snapshot.game.activePlayerId,
	);
	const fallback = player ?? createFallbackPlayer(snapshot.game.activePlayerId);
	return {
		playerId: fallback.id,
		before: fallback,
		after: fallback,
		delta: { resources: {}, stats: {}, population: {} },
		steps: [],
	} satisfies SimulateUpcomingPhasesResult;
}

function createAdvanceResult(snapshot: SessionSnapshot) {
	const player = snapshot.game.players.find(
		(entry) => entry.id === snapshot.game.activePlayerId,
	);
	const fallback = player ?? createFallbackPlayer(snapshot.game.activePlayerId);
	return {
		phase: snapshot.game.currentPhase,
		step: snapshot.game.currentStep,
		effects: [],
		player: fallback,
	} satisfies SessionAdvanceResult;
}

export function createLegacySessionMock(
	options: CreateLegacySessionMockOptions = {},
	overrides: LegacySessionOverrides = {},
): LegacySession {
	const snapshot = ensureSnapshot(options.snapshot);
	const defaultDefinition = options.actionDefinition;
	const defaultOptions = options.actionOptions ?? [];
	const defaultCosts = options.actionCosts ?? {};
	const defaultRequirements = options.actionRequirements ?? [];
	const defaultSimulation =
		options.simulateResult ?? createSimulationResult(snapshot);
	const defaultAdvance = options.advanceResult ?? createAdvanceResult(snapshot);
	const base: LegacySession = {
		enqueue: vi.fn(<T>(task: () => Promise<T> | T) =>
			Promise.resolve().then(task),
		),
		getSnapshot: vi.fn(() => snapshot),
		getActionCosts: vi.fn(
			(_actionId: string, _params?: ActionParametersPayload) => ({
				...defaultCosts,
			}),
		),
		getActionRequirements: vi.fn(
			(_actionId: string, _params?: ActionParametersPayload) => [
				...defaultRequirements,
			],
		),
		getActionOptions: vi.fn((_) => [...defaultOptions]),
		getActionDefinition: vi.fn(() => defaultDefinition),
		runAiTurn: vi.fn(() => Promise.resolve(false)),
		hasAiController: vi.fn(() => false),
		simulateUpcomingPhases: vi.fn(() => defaultSimulation),
		advancePhase: vi.fn(() => defaultAdvance),
		setDevMode: vi.fn(),
		updatePlayerName: vi.fn(),
	} satisfies LegacySession;
	return Object.assign(base, overrides);
}

export type { LegacySession };
