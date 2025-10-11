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
} from '@kingdom-builder/protocol/session';
import {
	GameApiError,
	GameApiFake,
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
});

describe('createGameApiMock', () => {
	it('delegates to provided handlers', async () => {
		const handler = vi
			.fn()
			.mockResolvedValue(createStateResponse('mock-session'));
		const mock = createGameApiMock({
			createSession: handler,
			fetchSnapshot: handler,
		});

		await expect(mock.createSession()).resolves.toEqual(
			createStateResponse('mock-session'),
		);
		await mock.fetchSnapshot('mock-session');
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it('throws when handler is missing', async () => {
		const mock = createGameApiMock();

		await expect(mock.fetchSnapshot('missing')).rejects.toThrow(
			'fetchSnapshot handler not provided.',
		);
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
