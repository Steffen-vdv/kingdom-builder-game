import { vi } from 'vitest';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
	SessionAdvanceResult,
	SessionRunAiResponse,
	SessionSimulateResponse,
	SessionSnapshot,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol/session';
import { getOrCreateRemoteAdapter } from '../../src/state/remoteSessionAdapter';
import type { LegacySession } from '../../src/state/sessionTypes';
import {
	assertSessionRecord,
	getSessionRecord,
	initializeSessionState,
	updateSessionSnapshot,
} from '../../src/state/sessionStateStore';
import { createSessionRegistriesPayload } from './sessionRegistries';
import { createSessionSnapshot, createSnapshotPlayer } from './sessionFixtures';

interface CreateLegacySessionMockOptions {
	sessionId?: string;
	snapshot?: SessionSnapshot;
	registries?: SessionRegistriesPayload;
	actionDefinition?: SessionActionDefinitionSummary | undefined;
	actionOptions?: ActionEffectGroup[];
	actionCosts?: SessionActionCostMap;
	actionRequirements?: SessionActionRequirementList;
	simulateResult?: SessionSimulateResponse['result'];
	advanceResult?: SessionAdvanceResult;
	aiResponse?: SessionRunAiResponse;
}

type LegacySessionOverrides = Partial<LegacySession>;

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

const ensureRegistries = (
	registries?: SessionRegistriesPayload,
): SessionRegistriesPayload =>
	registries ? clone(registries) : createSessionRegistriesPayload();

const ensureSnapshot = (snapshot?: SessionSnapshot): SessionSnapshot => {
	if (snapshot) {
		return clone(snapshot);
	}
	const primary = createSnapshotPlayer({ id: 'A' });
	const opponent = createSnapshotPlayer({ id: 'B' });
	return createSessionSnapshot({
		players: [primary, opponent],
		activePlayerId: primary.id,
		opponentId: opponent.id,
		phases: [
			{
				id: 'phase:setup',
				steps: [{ id: 'phase:setup:start' }],
			},
		],
		actionCostResource: 'resource:action',
		ruleSnapshot: {
			tieredResourceKey: 'resource:action',
			tierDefinitions: [],
			winConditions: [],
		},
	});
};

const createSimulationResult = (
	snapshot: SessionSnapshot,
	result?: SessionSimulateResponse['result'],
): SessionSimulateResponse['result'] => {
	if (result) {
		return clone(result);
	}
	const player = snapshot.game.players.find(
		(entry) => entry.id === snapshot.game.activePlayerId,
	);
	const fallback =
		player ?? createSnapshotPlayer({ id: snapshot.game.activePlayerId });
	return {
		playerId: fallback.id,
		before: fallback,
		after: fallback,
		delta: { resources: {}, stats: {}, population: {} },
		steps: [],
	} satisfies SessionSimulateResponse['result'];
};

const createAdvanceResult = (
	snapshot: SessionSnapshot,
	advance?: SessionAdvanceResult,
): SessionAdvanceResult => {
	if (advance) {
		return clone(advance);
	}
	const player = snapshot.game.players.find(
		(entry) => entry.id === snapshot.game.activePlayerId,
	);
	const fallback =
		player ?? createSnapshotPlayer({ id: snapshot.game.activePlayerId });
	return {
		phase: snapshot.game.currentPhase,
		step: snapshot.game.currentStep,
		effects: [],
		player: fallback,
	} satisfies SessionAdvanceResult;
};

const createAiResponse = (
	sessionId: string,
	snapshot: SessionSnapshot,
	registries: SessionRegistriesPayload,
	response?: SessionRunAiResponse,
): SessionRunAiResponse =>
	response
		? clone(response)
		: ({
				sessionId,
				ranTurn: false,
				snapshot,
				registries,
			} satisfies SessionRunAiResponse);

export function createLegacySessionMock(
	options: CreateLegacySessionMockOptions = {},
	overrides: LegacySessionOverrides = {},
): LegacySession {
	const sessionId = options.sessionId ?? 'session:test';
	const snapshot = ensureSnapshot(options.snapshot);
	const registries = ensureRegistries(options.registries);
	const simulation = createSimulationResult(snapshot, options.simulateResult);
	const advance = createAdvanceResult(snapshot, options.advanceResult);
	const aiResponse = createAiResponse(
		sessionId,
		snapshot,
		registries,
		options.aiResponse,
	);

	const existingRecord = getSessionRecord(sessionId);
	if (!existingRecord) {
		initializeSessionState({ sessionId, snapshot, registries });
	} else {
		updateSessionSnapshot(sessionId, snapshot);
	}

	const adapter = getOrCreateRemoteAdapter(sessionId, {
		ensureGameApi: () => {
			throw new Error('GameApi not available in test adapter');
		},
		runAiTurn: vi.fn(() => Promise.resolve(aiResponse)),
	});

	adapter.cacheSimulation(simulation.playerId, simulation);
	adapter.recordAdvanceResult(advance);

	const record = assertSessionRecord(sessionId);

	Object.assign(adapter, {
		getActionCosts: vi.fn(
			(_actionId: string, _params?: ActionParametersPayload) => ({
				...(options.actionCosts ?? {}),
			}),
		),
		getActionRequirements: vi.fn(
			(_actionId: string, _params?: ActionParametersPayload) => [
				...(options.actionRequirements ?? []),
			],
		),
		getActionOptions: vi.fn((_actionId: string) => [
			...((options.actionOptions ?? []) as ActionEffectGroup[]),
		]),
		getActionDefinition: vi.fn(
			(actionId: string): SessionActionDefinitionSummary | undefined => {
				const entry = record.registries.actions.get(actionId);
				if (!entry) {
					return options.actionDefinition;
				}
				return {
					id: entry.id,
					name: entry.name,
					system: entry.system,
				} satisfies SessionActionDefinitionSummary;
			},
		),
	});

	return Object.assign(adapter, overrides);
}

export type { LegacySession };
