import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type {
	ActionExecuteErrorResponse,
	ActionExecuteRequest,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
	SessionStateResponse,
	SessionSetDevModeRequest,
	SessionActionCostResponse,
	SessionActionRequirementResponse,
	SessionActionOptionsResponse,
	SessionRunAiResponse,
	SessionSimulateResponse,
	SessionSimulateRequest,
	SessionUpdatePlayerNameRequest,
} from '@kingdom-builder/protocol/session';
import {
	GameApiError,
	GameApiFake,
	type GameApiMockHandlers,
	createGameApi,
	createGameApiMock,
} from '../../src/services/gameApi';
import { createSessionRegistriesPayload } from '../helpers/sessionRegistries';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

type JsonResponseOptions = {
	status?: number;
};

const createJsonResponse = <T>(value: T, options: JsonResponseOptions = {}) =>
	new Response(JSON.stringify(value), {
		status: options.status ?? 200,
		headers: { 'Content-Type': 'application/json' },
	});

const missingMockHandlerMessage = (name: keyof GameApiMockHandlers): string =>
	[
		`Missing handler for ${name}.`,
		'Configure createGameApiMock with a handler before using this mock.',
	].join(' ');

const createPlayerSnapshot = (
	id: SessionPlayerId,
	overrides: Partial<SessionPlayerStateSnapshot> = {},
): SessionPlayerStateSnapshot => ({
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
	...overrides,
});

const createSnapshot = (
	overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot => {
	const players: SessionPlayerStateSnapshot[] = [
		createPlayerSnapshot('A'),
		createPlayerSnapshot('B'),
	];
	const snapshot: SessionSnapshot = {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: 'phase-0',
			currentStep: 'step-0',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players,
			activePlayerId: 'A',
			opponentId: 'B',
			...overrides.game,
		},
		phases: overrides.phases ?? [{ id: 'phase-0', steps: [{ id: 'step-0' }] }],
		actionCostResource: overrides.actionCostResource ?? 'resource.gold',
		recentResourceGains: overrides.recentResourceGains ?? [],
		compensations: overrides.compensations ?? {
			A: { resources: {} },
			B: { resources: {} },
		},
		rules: overrides.rules ?? {
			tieredResourceKey: 'resource.happiness',
			tierDefinitions: [],
			winConditions: [],
		},
		passiveRecords: overrides.passiveRecords ?? {
			A: [],
			B: [],
		},
		metadata: overrides.metadata ?? { passiveEvaluationModifiers: {} },
	};

	return {
		...snapshot,
		...overrides,
	};
};

const createStateResponse = (
	sessionId: string,
	snapshotOverrides: Partial<SessionSnapshot> = {},
): SessionStateResponse => ({
	sessionId,
	snapshot: createSnapshot(snapshotOverrides),
	registries: createSessionRegistriesPayload(),
});

const createSimulationResponse = (
	sessionId: string,
	playerId: SessionPlayerId,
): SessionSimulateResponse => ({
	sessionId,
	result: {
		playerId,
		before: createPlayerSnapshot(playerId),
		after: createPlayerSnapshot(playerId, {
			resources: { 'resource.gold': 11 },
		}),
		delta: {
			resources: { 'resource.gold': 1 },
			stats: {},
			population: {},
		},
		steps: [],
	},
});

const createRunAiResponse = (
	sessionId: string,
	ranTurn: boolean,
): SessionRunAiResponse => ({
	sessionId,
	snapshot: createSnapshot(),
	registries: createSessionRegistriesPayload(),
	ranTurn,
});

const createAdvanceResponse = (sessionId: string): SessionAdvanceResponse => ({
	sessionId,
	snapshot: createSnapshot(),
	advance: {
		phase: 'phase-0',
		step: 'step-0',
		effects: [],
		player: createPlayerSnapshot('A'),
	},
});

describe('createGameApi', () => {
	it('sends JSON requests with auth headers', async () => {
		const sessionResponse = createStateResponse('session-1');
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createJsonResponse(sessionResponse));
		const tokenProvider = vi.fn().mockResolvedValue('token-123');
		const api = createGameApi({
			baseUrl: '/service',
			fetchFn: fetchMock,
			getAuthToken: tokenProvider,
		});
		const request: SessionCreateRequest = { devMode: true };

		const response = await api.createSession(request);

		expect(response).toEqual(sessionResponse);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/service/sessions');
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(JSON.stringify(request));
		const headers = init?.headers as Headers;
		expect(headers.get('Authorization')).toBe('Bearer token-123');
		expect(headers.get('Content-Type')).toBe('application/json');
		expect(headers.has('Connection')).toBe(false);
		const safeHeaders = Array.from(headers.entries());
		expect(safeHeaders).toHaveLength(3);
		expect(safeHeaders).toEqual(
			expect.arrayContaining([
				['accept', 'application/json'],
				['content-type', 'application/json'],
				['authorization', 'Bearer token-123'],
			]),
		);
	});

	it('throws GameApiError on non-success responses', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				createJsonResponse({ error: 'nope' }, { status: 400 }),
			);
		const api = createGameApi({ fetchFn: fetchMock });

		await expect(api.fetchSnapshot('missing')).rejects.toMatchObject({
			status: 400,
			body: { error: 'nope' },
		});
	});

	it('passes abort signals through request init', async () => {
		const response = createStateResponse('session-2');
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });
		const controller = new AbortController();

		await api.fetchSnapshot('session-2', {
			signal: controller.signal,
		});

		const [, init] = fetchMock.mock.calls[0] ?? [];
		expect(init?.signal).toBe(controller.signal);
	});

	it('requests session snapshots from the snapshot endpoint', async () => {
		const response = createStateResponse('session/special');
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });

		await api.fetchSnapshot('session/special');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/sessions/session%2Fspecial/snapshot');
		expect(init?.method).toBe('GET');
	});

	it('omits JSON content type when no request body is present', async () => {
		const response = createStateResponse('session-headers');
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });

		await api.fetchSnapshot('session-headers');

		const [, init] = fetchMock.mock.calls[0];
		const headers = init?.headers as Headers;
		expect(headers.has('Content-Type')).toBe(false);
		expect(headers.get('Accept')).toBe('application/json');
	});

	it('performs actions with typed responses', async () => {
		const successResponse: ActionExecuteSuccessResponse = {
			status: 'success',
			snapshot: createSnapshot(),
			costs: {},
			traces: [],
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createJsonResponse(successResponse));
		const api = createGameApi({ fetchFn: fetchMock });
		const request: ActionExecuteRequest = {
			sessionId: 'session-5',
			actionId: 'action.do-thing',
		};

		const response = await api.performAction(request);

		expect(response).toEqual(successResponse);
		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/sessions/session-5/actions');
	});

	it('returns action error payloads when the service responds with conflicts', async () => {
		const errorResponse: ActionExecuteErrorResponse = {
			status: 'error',
			error: 'Insufficient resource.gold: need 8, have 7',
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createJsonResponse(errorResponse, { status: 409 }));
		const api = createGameApi({ fetchFn: fetchMock });
		const request: ActionExecuteRequest = {
			sessionId: 'session-conflict',
			actionId: 'action.build',
			params: { id: 'mill' },
		};

		const response = await api.performAction(request);

		expect(response).toEqual(errorResponse);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('toggles dev mode for sessions', async () => {
		const response = createStateResponse('session-dev');
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });
		const request: SessionSetDevModeRequest = {
			sessionId: 'session-dev',
			enabled: true,
		};

		const result = await api.setDevMode(request);

		expect(result).toEqual(response);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/sessions/session-dev/dev-mode');
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(JSON.stringify({ enabled: true }));
	});

	it('propagates errors when toggling dev mode fails', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				createJsonResponse({ message: 'failed' }, { status: 503 }),
			);
		const api = createGameApi({ fetchFn: fetchMock });

		await expect(
			api.setDevMode({ sessionId: 'session-err', enabled: false }),
		).rejects.toMatchObject({
			status: 503,
			body: { message: 'failed' },
		});
	});

	it('updates player names via the patch endpoint', async () => {
		const response = createStateResponse('session-name');
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });
		const request: SessionUpdatePlayerNameRequest = {
			sessionId: 'session-name',
			playerId: 'A',
			playerName: 'Voyager',
		};

		const result = await api.updatePlayerName(request);

		expect(result).toEqual(response);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/sessions/session-name/player');
		expect(init?.method).toBe('PATCH');
		expect(init?.body).toBe(JSON.stringify(request));
	});

	it('fetches action costs for session actions', async () => {
		const response: SessionActionCostResponse = {
			sessionId: 'session-actions',
			costs: { 'resource.gold': 4 },
		};
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });

		const result = await api.getActionCosts({
			sessionId: 'session-actions',
			actionId: 'action.plan',
		});

		expect(result).toEqual(response);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/sessions/session-actions/actions/action.plan/costs');
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(
			JSON.stringify({
				sessionId: 'session-actions',
				actionId: 'action.plan',
			}),
		);
	});

	it('fetches action requirements for session actions', async () => {
		const response: SessionActionRequirementResponse = {
			sessionId: 'session-req',
			requirements: [],
		};
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });

		await api.getActionRequirements({
			sessionId: 'session-req',
			actionId: 'action.require',
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(
			'/api/sessions/session-req/actions/action.require/requirements',
		);
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(
			JSON.stringify({
				sessionId: 'session-req',
				actionId: 'action.require',
			}),
		);
	});

	it('retrieves action options for session actions', async () => {
		const response: SessionActionOptionsResponse = {
			sessionId: 'session-options',
			groups: [],
		};
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });

		const result = await api.getActionOptions({
			sessionId: 'session-options',
			actionId: 'action.options',
		});

		expect(result).toEqual(response);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(
			'/api/sessions/session-options/actions/action.options/options',
		);
		expect(init?.method).toBe('GET');
		expect(init?.body).toBeUndefined();
	});

	it('runs AI turns through the AI endpoint', async () => {
		const response = createRunAiResponse('session-ai', true);
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });

		const result = await api.runAiTurn({
			sessionId: 'session-ai',
			playerId: 'A',
		});

		expect(result).toEqual(response);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/sessions/session-ai/ai-turn');
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(
			JSON.stringify({ sessionId: 'session-ai', playerId: 'A' }),
		);
	});

	it('simulates upcoming phases via the simulation endpoint', async () => {
		const response = createSimulationResponse('session-sim', 'A');
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(response));
		const api = createGameApi({ fetchFn: fetchMock });
		const request: SessionSimulateRequest = {
			sessionId: 'session-sim',
			playerId: 'A',
			options: { maxIterations: 2 },
		};

		const result = await api.simulateUpcomingPhases(request);

		expect(result).toEqual(response);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/sessions/session-sim/simulate');
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(JSON.stringify(request));
	});
});

describe('createGameApiMock', () => {
	it('delegates to provided handlers', async () => {
		const createResponse = createStateResponse('mock-session');
		const updateResponse = createStateResponse('mock-session');
		const costResponse: SessionActionCostResponse = {
			sessionId: 'mock-session',
			costs: { 'resource.gold': 2 },
		};
		const requirementsResponse: SessionActionRequirementResponse = {
			sessionId: 'mock-session',
			requirements: [],
		};
		const optionsResponse: SessionActionOptionsResponse = {
			sessionId: 'mock-session',
			groups: [],
		};
		const runAiResponse = createRunAiResponse('mock-session', true);
		const simulationResponse = createSimulationResponse('mock-session', 'A');
		const mock = createGameApiMock({
			createSession: vi.fn().mockResolvedValue(createResponse),
			fetchSnapshot: vi.fn().mockResolvedValue(createResponse),
			setDevMode: vi.fn().mockResolvedValue(createResponse),
			updatePlayerName: vi.fn().mockResolvedValue(updateResponse),
			getActionCosts: vi.fn().mockResolvedValue(costResponse),
			getActionRequirements: vi.fn().mockResolvedValue(requirementsResponse),
			getActionOptions: vi.fn().mockResolvedValue(optionsResponse),
			runAiTurn: vi.fn().mockResolvedValue(runAiResponse),
			simulateUpcomingPhases: vi.fn().mockResolvedValue(simulationResponse),
		});

		await expect(mock.createSession()).resolves.toEqual(createResponse);
		await expect(mock.fetchSnapshot('mock-session')).resolves.toEqual(
			createResponse,
		);
		await expect(
			mock.setDevMode({ sessionId: 'mock-session', enabled: true }),
		).resolves.toEqual(createResponse);
		await expect(
			mock.updatePlayerName({
				sessionId: 'mock-session',
				playerId: 'A',
				playerName: 'Voyager',
			}),
		).resolves.toEqual(updateResponse);
		await expect(
			mock.getActionCosts({
				sessionId: 'mock-session',
				actionId: 'action.mock',
			}),
		).resolves.toEqual(costResponse);
		await expect(
			mock.getActionRequirements({
				sessionId: 'mock-session',
				actionId: 'action.mock',
			}),
		).resolves.toEqual(requirementsResponse);
		await expect(
			mock.getActionOptions({
				sessionId: 'mock-session',
				actionId: 'action.mock',
			}),
		).resolves.toEqual(optionsResponse);
		await expect(
			mock.runAiTurn({ sessionId: 'mock-session', playerId: 'A' }),
		).resolves.toEqual(runAiResponse);
		await expect(
			mock.simulateUpcomingPhases({
				sessionId: 'mock-session',
				playerId: 'A',
			}),
		).resolves.toEqual(simulationResponse);
	});

	it('throws when handler is missing', async () => {
		const mock = createGameApiMock();

		await expect(mock.fetchSnapshot('missing')).rejects.toThrow(
			missingMockHandlerMessage('fetchSnapshot'),
		);
		await expect(
			mock.getActionCosts({
				sessionId: 'missing',
				actionId: 'action',
			}),
		).rejects.toThrow(missingMockHandlerMessage('getActionCosts'));
	});
});

describe('GameApiFake', () => {
	it('returns primed responses', async () => {
		const fake = new GameApiFake();
		const createResponse = createStateResponse('session-fake');
		fake.setNextCreateResponse(createResponse);
		fake.setNextAdvanceResponse(createAdvanceResponse('session-fake'));
		const actionResponse: ActionExecuteErrorResponse = {
			status: 'error',
			error: 'Blocked',
		};
		fake.setNextActionResponse(actionResponse);

		await expect(fake.createSession()).resolves.toEqual(createResponse);
		await expect(
			fake.advancePhase({ sessionId: 'session-fake' }),
		).resolves.toEqual(createAdvanceResponse('session-fake'));
		await expect(
			fake.performAction({
				sessionId: 'session-fake',
				actionId: 'action',
			}),
		).resolves.toEqual(actionResponse);
	});

	it('stores responses from setDevMode calls', async () => {
		const fake = new GameApiFake();
		const response = createStateResponse('session-dev-mode', {
			game: { devMode: true } as Mutable<SessionSnapshot['game']>,
		});
		fake.setNextSetDevModeResponse(response);

		const result = await fake.setDevMode({
			sessionId: 'session-dev-mode',
			enabled: true,
		});

		expect(result).toEqual(response);
		const snapshot = await fake.fetchSnapshot('session-dev-mode');
		expect(snapshot.snapshot.game.devMode).toBe(true);
	});

	it('updates stored snapshot on successful actions', async () => {
		const fake = new GameApiFake();
		const session = createStateResponse('session-update');
		fake.primeSession(session);
		const updated: ActionExecuteSuccessResponse = {
			status: 'success',
			snapshot: createSnapshot({
				game: {
					...session.snapshot.game,
					turn: 2,
				} as Mutable<SessionSnapshot['game']>,
			}),
			costs: {},
			traces: [],
		};
		fake.setNextActionResponse(updated);

		await fake.performAction({
			sessionId: 'session-update',
			actionId: 'action.test',
		});
		const snapshot = await fake.fetchSnapshot('session-update');

		expect(snapshot.snapshot.game.turn).toBe(2);
		expect(snapshot).not.toBe(session);
	});

	it('applies primed player name responses', async () => {
		const fake = new GameApiFake();
		const response = createStateResponse('session-name');
		fake.setNextUpdatePlayerNameResponse(response);

		const result = await fake.updatePlayerName({
			sessionId: 'session-name',
			playerId: 'A',
			playerName: 'Voyager',
		});

		expect(result).toEqual(response);
		const stored = await fake.fetchSnapshot('session-name');
		expect(stored.snapshot).toEqual(response.snapshot);
	});

	it('updates player names locally when no response is primed', async () => {
		const fake = new GameApiFake();
		const session = createStateResponse('session-local');
		fake.primeSession(session);

		const result = await fake.updatePlayerName({
			sessionId: 'session-local',
			playerId: 'A',
			playerName: 'Scout',
		});

		const [player] = result.snapshot.game.players;
		expect(player?.name).toBe('Scout');
		const stored = await fake.fetchSnapshot('session-local');
		expect(stored.snapshot.game.players[0]?.name).toBe('Scout');
	});

	it('returns primed action metadata responses', async () => {
		const fake = new GameApiFake();
		const cost: SessionActionCostResponse = {
			sessionId: 'session-meta',
			costs: { 'resource.gold': 1 },
		};
		const requirements: SessionActionRequirementResponse = {
			sessionId: 'session-meta',
			requirements: [],
		};
		const options: SessionActionOptionsResponse = {
			sessionId: 'session-meta',
			groups: [],
		};
		fake.setNextActionCostResponse(cost);
		fake.setNextActionRequirementResponse(requirements);
		fake.setNextActionOptionsResponse(options);

		await expect(
			fake.getActionCosts({ sessionId: 'session-meta', actionId: 'action' }),
		).resolves.toEqual(cost);
		await expect(
			fake.getActionRequirements({
				sessionId: 'session-meta',
				actionId: 'action',
			}),
		).resolves.toEqual(requirements);
		await expect(
			fake.getActionOptions({
				sessionId: 'session-meta',
				actionId: 'action',
			}),
		).resolves.toEqual(options);
	});

	it('returns primed AI responses and updates sessions', async () => {
		const fake = new GameApiFake();
		const response = createRunAiResponse('session-ai', true);
		fake.setNextRunAiResponse(response);

		const result = await fake.runAiTurn({
			sessionId: 'session-ai',
			playerId: 'A',
		});

		expect(result).toEqual(response);
		const stored = await fake.fetchSnapshot('session-ai');
		expect(stored.snapshot).toEqual(response.snapshot);
	});

	it('uses primed AI map entries for repeated runs', async () => {
		const fake = new GameApiFake();
		const response = createRunAiResponse('session-ai-map', false);
		fake.primeRunAiResponse('session-ai-map', 'A', response);

		await fake.runAiTurn({ sessionId: 'session-ai-map', playerId: 'A' });
		await fake.runAiTurn({ sessionId: 'session-ai-map', playerId: 'A' });
		const stored = await fake.fetchSnapshot('session-ai-map');
		expect(stored.snapshot).toEqual(response.snapshot);
	});

	it('returns primed simulation results', async () => {
		const fake = new GameApiFake();
		const response = createSimulationResponse('session-sim', 'A');
		fake.setNextSimulationResponse(response);

		await expect(
			fake.simulateUpcomingPhases({
				sessionId: 'session-sim',
				playerId: 'A',
			}),
		).resolves.toEqual(response);
	});

	it('uses simulation map entries for repeated requests', async () => {
		const fake = new GameApiFake();
		const response = createSimulationResponse('session-sim-map', 'A');
		fake.primeSimulationResult('session-sim-map', 'A', response);

		const first = await fake.simulateUpcomingPhases({
			sessionId: 'session-sim-map',
			playerId: 'A',
		});
		const second = await fake.simulateUpcomingPhases({
			sessionId: 'session-sim-map',
			playerId: 'A',
		});

		expect(first).toEqual(response);
		expect(second).toEqual(response);
	});

	it('throws GameApiError for unknown sessions', async () => {
		const fake = new GameApiFake();

		await expect(fake.fetchSnapshot('missing')).rejects.toBeInstanceOf(
			GameApiError,
		);
	});
});

describe('GameApiFake without structuredClone', () => {
	const globalTarget = globalThis as {
		structuredClone?: typeof structuredClone;
	};
	let originalStructuredClone: typeof structuredClone | undefined;

	const withStructuredClone = <T>(factory: () => T): T => {
		if (originalStructuredClone) {
			globalTarget.structuredClone = originalStructuredClone;
		}

		try {
			return factory();
		} finally {
			delete globalTarget.structuredClone;
		}
	};

	beforeAll(() => {
		originalStructuredClone = globalTarget.structuredClone;
		delete globalTarget.structuredClone;
	});

	afterAll(() => {
		if (originalStructuredClone) {
			globalTarget.structuredClone = originalStructuredClone;
		} else {
			delete globalTarget.structuredClone;
		}
	});

	it('isolates primed sessions from external mutations', async () => {
		const fake = new GameApiFake();
		const session = withStructuredClone(() =>
			createStateResponse('session-primed'),
		);
		fake.primeSession(session);

		const fetched = await fake.fetchSnapshot('session-primed');
		const mutableFetched = fetched as Mutable<SessionStateResponse>;
		const mutableGame = mutableFetched.snapshot.game as Mutable<
			SessionSnapshot['game']
		>;
		mutableGame.turn = 99;

		const refetched = await fake.fetchSnapshot('session-primed');
		expect(refetched.snapshot.game.turn).toBe(session.snapshot.game.turn);
		expect(refetched.snapshot.game.turn).not.toBe(99);
	});

	it('isolates createSession responses from stored state', async () => {
		const fake = new GameApiFake();
		const createResponse = withStructuredClone(() =>
			createStateResponse('session-create'),
		);
		const mutableCreate = createResponse as Mutable<SessionStateResponse>;
		const mutableCreateGame = mutableCreate.snapshot.game as Mutable<
			SessionSnapshot['game']
		>;
		mutableCreateGame.turn = 5;
		fake.setNextCreateResponse(createResponse);

		const response = await fake.createSession();
		const mutableResponse = response as Mutable<SessionCreateResponse>;
		const mutableResponseGame = mutableResponse.snapshot.game as Mutable<
			SessionSnapshot['game']
		>;
		mutableResponseGame.turn = 42;

		const stored = await fake.fetchSnapshot('session-create');
		expect(stored.snapshot.game.turn).toBe(5);
		expect(stored.snapshot.game.turn).not.toBe(42);
	});

	it('isolates advancePhase responses from stored state', async () => {
		const fake = new GameApiFake();
		const primed = withStructuredClone(() =>
			createStateResponse('session-advance'),
		);
		fake.primeSession(primed);
		const advanceResponse = createAdvanceResponse('session-advance');
		const mutableAdvance = advanceResponse as Mutable<SessionAdvanceResponse>;
		const mutableAdvanceGame = mutableAdvance.snapshot.game as Mutable<
			SessionSnapshot['game']
		>;
		mutableAdvanceGame.turn = 7;
		fake.setNextAdvanceResponse(advanceResponse);

		const response = await fake.advancePhase({
			sessionId: 'session-advance',
		});
		const mutableResponse = response as Mutable<SessionAdvanceResponse>;
		const mutableResponseGame = mutableResponse.snapshot.game as Mutable<
			SessionSnapshot['game']
		>;
		mutableResponseGame.turn = 11;

		const stored = await fake.fetchSnapshot('session-advance');
		expect(stored.snapshot.game.turn).toBe(7);
		expect(stored.snapshot.game.turn).not.toBe(11);
	});

	it('isolates performAction responses from stored state', async () => {
		const fake = new GameApiFake();
		const primed = withStructuredClone(() =>
			createStateResponse('session-action'),
		);
		fake.primeSession(primed);
		const actionResponse: ActionExecuteSuccessResponse = {
			status: 'success',
			snapshot: createSnapshot({
				game: {
					...createSnapshot().game,
					turn: 3,
				} as Mutable<SessionSnapshot['game']>,
			}),
			costs: {},
			traces: [],
		};
		fake.setNextActionResponse(actionResponse);

		const response = await fake.performAction({
			sessionId: 'session-action',
			actionId: 'action.test',
		});
		const mutableResponse = response as Mutable<ActionExecuteSuccessResponse>;
		const mutableResponseGame = mutableResponse.snapshot.game as Mutable<
			SessionSnapshot['game']
		>;
		mutableResponseGame.turn = 21;

		const stored = await fake.fetchSnapshot('session-action');
		expect(stored.snapshot.game.turn).toBe(3);
		expect(stored.snapshot.game.turn).not.toBe(21);
	});
});
