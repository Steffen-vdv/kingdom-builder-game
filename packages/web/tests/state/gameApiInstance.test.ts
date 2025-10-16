import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureGameApi, setGameApi } from '../../src/state/gameApiInstance';
import * as authTokenModule from '../../src/state/authToken';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';

const [resourceKey] = createResourceKeys();
if (!resourceKey) {
	throw new Error('createResourceKeys returned an empty list.');
}

const playerA = createSnapshotPlayer({
	id: 'A',
	resources: { [resourceKey]: 5 },
});
const playerB = createSnapshotPlayer({
	id: 'B',
	resources: { [resourceKey]: 3 },
});

const snapshot = createSessionSnapshot({
	players: [playerA, playerB],
	activePlayerId: playerA.id,
	opponentId: playerB.id,
	phases: [
		{
			id: 'phase-main',
			action: true,
			steps: [{ id: 'phase-main:start' }],
		},
	],
	actionCostResource: resourceKey,
	turn: 1,
	currentPhase: 'phase-main',
	currentStep: 'phase-main:start',
	phaseIndex: 0,
	stepIndex: 0,
	devMode: false,
	ruleSnapshot: {
		tieredResourceKey: resourceKey,
		tierDefinitions: [],
		winConditions: [],
	},
});

const registries = createSessionRegistriesPayload();

const sessionResponse = {
	sessionId: 'session-auth',
	snapshot,
	registries,
};

describe('ensureGameApi', () => {
	afterEach(() => {
		setGameApi(null);
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('attaches the resolved auth token to outgoing requests', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(
				new Response(JSON.stringify(sessionResponse), {
					status: 201,
					headers: { 'Content-Type': 'application/json' },
				}),
			),
		);
		vi.stubGlobal('fetch', fetchMock);
		const tokenSpy = vi
			.spyOn(authTokenModule, 'resolveAuthToken')
			.mockResolvedValue('header-token');
		const api = ensureGameApi();
		const result = await api.createSession({ devMode: false });
		expect(result.sessionId).toBe('session-auth');
		expect(tokenSpy).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] ?? [];
		const headers = new Headers(init?.headers);
		expect(headers.get('Authorization')).toBe('Bearer header-token');
	});
});
