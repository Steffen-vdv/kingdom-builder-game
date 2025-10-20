import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionExecuteSuccessResponse } from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceResult,
	SessionResourceDefinition,
	SessionRunAiResponse,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol/session';
import {
	advanceSessionPhase,
	createSession,
	fetchSnapshot,
	performSessionAction,
	releaseSession,
	runAiTurn,
	setGameApi,
	setSessionDevMode,
	simulateUpcomingPhases,
	updatePlayerName,
} from '../../src/state/sessionSdk';
import {
	GameApiFake,
	createGameApi,
	createGameApiMock,
} from '../../src/services/gameApi';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import {
	getSessionRecord,
	clearSessionStateStore,
} from '../../src/state/sessionStateStore';
import * as sessionStateStoreModule from '../../src/state/sessionStateStore';

const resourceKeys = createResourceKeys();
const [resourceKey] = resourceKeys;
if (!resourceKey) {
	throw new Error('RESOURCE_KEYS is empty');
}

const playerA = createSnapshotPlayer({
	id: 'A',
	name: 'Commander',
	resources: { [resourceKey]: 10 },
});
const playerB = createSnapshotPlayer({
	id: 'B',
	name: 'Scout',
	resources: { [resourceKey]: 5 },
});

const phases = [
	{
		id: 'phase-main',
		action: true,
		steps: [{ id: 'phase-main:start' }],
	},
];

const mainStepId = phases[0]?.steps?.[0]?.id ?? 'phase-main:start';

const resources: Record<string, SessionResourceDefinition> = Object.fromEntries(
	resourceKeys.map((key) => [key, { key, icon: '🪙', label: key }]),
);

const initialSnapshot = createSessionSnapshot({
	players: [playerA, playerB],
	activePlayerId: playerA.id,
	opponentId: playerB.id,
	phases,
	actionCostResource: resourceKey,
	ruleSnapshot: {
		tieredResourceKey: resourceKey,
		tierDefinitions: [],
		winConditions: [],
	},
	turn: 1,
	currentPhase: phases[0]?.id ?? 'phase-main',
	currentStep: mainStepId,
});

const taxActionId = 'tax';

describe('sessionSdk', () => {
	let api: GameApiFake;
	let registries: ReturnType<typeof createSessionRegistriesPayload>;

	beforeEach(() => {
		api = new GameApiFake();
		setGameApi(api);
		registries = createSessionRegistriesPayload();
		registries.resources = resources;
		api.setNextCreateResponse({
			sessionId: 'session-1',
			snapshot: initialSnapshot,
			registries,
		});
	});

	afterEach(() => {
		setGameApi(null);
		clearSessionStateStore();
	});

	it('creates a session using the API response payload', async () => {
		const created = await createSession({
			devMode: true,
			playerName: 'Commander',
		});
		expect(created.sessionId).toBe('session-1');
		expect(created.adapter).toBeDefined();
		expect(created.record.snapshot).toEqual(initialSnapshot);
		expect(created.record.ruleSnapshot).toEqual(initialSnapshot.rules);
		expect(created.record.resourceKeys).toEqual(resourceKeys);
		expect(created.record.metadata).toEqual(initialSnapshot.metadata);
	});

	it('fetches snapshots via the API client', async () => {
		await createSession();
		const fetched = await fetchSnapshot('session-1');
		expect(fetched.record.snapshot).toEqual(initialSnapshot);
		expect(fetched.record.ruleSnapshot).toEqual(initialSnapshot.rules);
		expect(fetched.record.metadata).toEqual(initialSnapshot.metadata);
	});

	it('initializes session state when fetching snapshot without existing record', async () => {
		api.primeSession({
			sessionId: 'session-1',
			snapshot: initialSnapshot,
			registries,
		});
		const fetched = await fetchSnapshot('session-1');
		expect(fetched.record.snapshot).toEqual(initialSnapshot);
		expect(getSessionRecord('session-1')?.snapshot).toEqual(initialSnapshot);
	});

	it('sets dev mode via the API and refreshes local state', async () => {
		await createSession();
		const updatedSnapshot = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot: initialSnapshot.rules,
			turn: 5,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: mainStepId,
			devMode: true,
		});
		const mutatedRegistries = createSessionRegistriesPayload();
		mutatedRegistries.actions[taxActionId] = {
			...mutatedRegistries.actions[taxActionId],
			name: 'Tax (Developer)',
		};
		delete mutatedRegistries.resources[resourceKey];
		api.setNextSetDevModeResponse({
			sessionId: 'session-1',
			snapshot: updatedSnapshot,
			registries: mutatedRegistries,
		});
		const result = await setSessionDevMode('session-1', true);
		expect(result.record.snapshot).toEqual(updatedSnapshot);
		expect(result.record.registries.actions.get(taxActionId)?.name).toBe(
			'Tax (Developer)',
		);
		expect(result.record.resourceKeys).not.toContain(resourceKey);
	});

	it('performs actions via the API', async () => {
		await createSession();
		const updatedSnapshot = createSessionSnapshot({
			players: [
				createSnapshotPlayer({
					id: playerA.id,
					name: playerA.name,
					resources: { [resourceKey]: 12 },
				}),
				playerB,
			],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot: initialSnapshot.rules,
			turn: 2,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: mainStepId,
		});
		const successResponse: ActionExecuteSuccessResponse = {
			status: 'success',
			snapshot: updatedSnapshot,
			costs: {},
			traces: [],
		};
		api.setNextActionResponse(successResponse);
		const response = await performSessionAction({
			sessionId: 'session-1',
			actionId: taxActionId,
		});
		expect(response).toEqual(successResponse);
		const record = getSessionRecord('session-1');
		expect(record?.snapshot).toEqual(updatedSnapshot);
	});

	it('returns error payloads when the API action fails', async () => {
		await createSession();
		api.setNextActionResponse({
			status: 'error',
			error: 'Nope.',
		});
		const response = await performSessionAction({
			sessionId: 'session-1',
			actionId: taxActionId,
		});
		expect(response.status).toBe('error');
		expect(response).toHaveProperty('error', 'Nope.');
	});

	it('skips the queue when requested', async () => {
		await createSession();
		const enqueueSpy = vi.spyOn(sessionStateStoreModule, 'enqueueSessionTask');
		const successResponse: ActionExecuteSuccessResponse = {
			status: 'success',
			snapshot: initialSnapshot,
			costs: {},
			traces: [],
		};
		api.setNextActionResponse(successResponse);
		const response = await performSessionAction(
			{
				sessionId: 'session-1',
				actionId: taxActionId,
			},
			undefined,
			{ skipQueue: true },
		);
		expect(response).toEqual(successResponse);
		expect(enqueueSpy).not.toHaveBeenCalled();
		enqueueSpy.mockRestore();
	});

	it('converts thrown API errors into error responses', async () => {
		await createSession();
		setGameApi(
			createGameApiMock({
				performAction: () => {
					throw new Error('Boom');
				},
			}),
		);
		const response = await performSessionAction({
			sessionId: 'session-1',
			actionId: taxActionId,
		});
		expect(response.status).toBe('error');
		expect(response).toHaveProperty('error', 'Boom');
	});

	it('advances phases via the API and exposes results', async () => {
		const created = await createSession();
		const advanceResult: SessionAdvanceResult = {
			phase: 'phase-main',
			step: 'phase-main:start',
			effects: [],
			player: playerA,
		};
		const updatedSnapshot = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot: initialSnapshot.rules,
			turn: 2,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: mainStepId,
		});
		api.setNextAdvanceResponse({
			sessionId: 'session-1',
			snapshot: updatedSnapshot,
			advance: advanceResult,
			registries: createSessionRegistriesPayload(),
		});
		const response = await advanceSessionPhase({
			sessionId: 'session-1',
		});
		expect(response.advance).toEqual(advanceResult);
		const cachedAdvance = created.adapter.advancePhase();
		expect(cachedAdvance).toEqual(advanceResult);
	});

	it('runs AI turns via the API and refreshes local state', async () => {
		const created = await createSession();
		const updatedSnapshot = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerB.id,
			opponentId: playerA.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot: initialSnapshot.rules,
			turn: 2,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: mainStepId,
		});
		const runAiResponse: SessionRunAiResponse = {
			sessionId: 'session-1',
			snapshot: updatedSnapshot,
			registries: createSessionRegistriesPayload(),
			ranTurn: true,
			actions: [],
			phaseComplete: false,
		};
		api.setNextRunAiResponse(runAiResponse);
		const response = await runAiTurn({
			sessionId: 'session-1',
			playerId: playerA.id,
		});
		expect(response).toEqual(runAiResponse);
		const record = getSessionRecord('session-1');
		expect(record?.snapshot).toEqual(updatedSnapshot);
		api.setNextRunAiResponse(runAiResponse);
		const adapterResult = await created.adapter.runAiTurn(playerA.id);
		expect(adapterResult.ranTurn).toBe(runAiResponse.ranTurn);
		expect(adapterResult.phaseComplete).toBe(runAiResponse.phaseComplete);
		expect(adapterResult.actions).toEqual(runAiResponse.actions);
		expect(adapterResult.snapshot).toEqual(updatedSnapshot);
		const recordAfterAdapter = getSessionRecord('session-1');
		expect(recordAfterAdapter?.snapshot).toBe(adapterResult.snapshot);
		expect(recordAfterAdapter?.registries).toBe(adapterResult.registries);
	});

	it('caches simulation results for the adapter', async () => {
		const created = await createSession();
		const simulation: SessionSimulateResponse = {
			sessionId: 'session-1',
			result: {
				delta: {
					resources: {},
					stats: {},
					population: {},
				},
				before: playerA,
				after: playerA,
				steps: [],
			},
		};
		api.setNextSimulationResponse(simulation);
		const response = await simulateUpcomingPhases({
			sessionId: 'session-1',
			playerId: playerA.id,
		});
		expect(response).toEqual(simulation);
		const cached = created.adapter.simulateUpcomingPhases(playerA.id);
		expect(cached).toEqual(simulation.result);
	});

	it('updates player names via the API', async () => {
		await createSession();
		const updatedSnapshot = createSessionSnapshot({
			players: [
				createSnapshotPlayer({
					id: playerA.id,
					name: 'Strategist',
					resources: playerA.resources,
				}),
				playerB,
			],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot: initialSnapshot.rules,
			turn: 1,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: mainStepId,
		});
		api.setNextUpdatePlayerNameResponse({
			sessionId: 'session-1',
			snapshot: updatedSnapshot,
			registries: createSessionRegistriesPayload(),
		});
		const response = await updatePlayerName({
			sessionId: 'session-1',
			playerId: playerA.id,
			playerName: 'Strategist',
		});
		expect(response.snapshot).toEqual(updatedSnapshot);
		const record = getSessionRecord('session-1');
		const updatedName = record?.snapshot.game.players[0]?.name;
		expect(updatedName).toBe('Strategist');
	});

	it('releases session state from the local cache', async () => {
		await createSession();
		releaseSession('session-1');
		expect(getSessionRecord('session-1')).toBeUndefined();
	});

	it('propagates abort signals without touching registries', async () => {
		await createSession();
		const missingSignalError = new Error('Missing abort signal.');
		const abortDomException = new DOMException('Aborted', 'AbortError');
		const fetchMock = vi.fn(
			(_input: RequestInfo, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					const signal = init?.signal;
					if (!signal) {
						reject(missingSignalError);
						return;
					}
					signal.addEventListener('abort', () => reject(abortDomException), {
						once: true,
					});
				}),
		);
		setGameApi(createGameApi({ fetchFn: fetchMock }));
		const controller = new AbortController();
		const promise = fetchSnapshot('session-1', {
			signal: controller.signal,
		});
		controller.abort();
		await expect(promise).rejects.toBeInstanceOf(DOMException);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
