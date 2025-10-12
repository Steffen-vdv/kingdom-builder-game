import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { ActionExecuteSuccessResponse } from '@kingdom-builder/protocol/actions';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import {
	createSession,
	fetchSnapshot,
	performSessionAction,
	advanceSessionPhase,
	releaseSession,
	setSessionDevMode,
	setGameApi,
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
import * as sessionRegistriesModule from '../../src/state/sessionRegistries';

const getLegacyContentConfigMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/startup/runtimeConfig', () => ({
	getLegacyContentConfig: getLegacyContentConfigMock,
}));

describe('sessionSdk', () => {
	const resourceKeys = createResourceKeys();
	const [resourceKey] = resourceKeys;
	if (!resourceKey) {
		throw new Error('RESOURCE_KEYS is empty');
	}
	const phases: PhaseConfig[] = [
		{
			id: 'phase-main',
			action: true,
			steps: [{ id: 'phase-main:start' }],
		},
	];
	const ruleSnapshot = {
		tieredResourceKey: resourceKey,
		tierDefinitions: [],
		winConditions: [],
	} as const;
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
	const resources: Record<string, SessionResourceDefinition> =
		Object.fromEntries(
			resourceKeys.map((key) => [key, { key, icon: '🪙', label: key }]),
		);
	const startConfig: StartConfig = {
		player: {
			resources: { [resourceKey]: 10 },
			stats: {},
			population: {},
			lands: [],
			buildings: [],
		},
	};
	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'nearest',
		tieredResourceKey: resourceKey,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: [],
	};
	const initialSnapshot = createSessionSnapshot({
		players: [playerA, playerB],
		activePlayerId: playerA.id,
		opponentId: playerB.id,
		phases,
		actionCostResource: resourceKey,
		ruleSnapshot,
		turn: 1,
		currentPhase: phases[0]?.id ?? 'phase-main',
		currentStep: phases[0]?.steps?.[0]?.id ?? 'phase-main',
	});
	let api: GameApiFake;
	beforeEach(() => {
		getLegacyContentConfigMock.mockResolvedValue({
			phases,
			start: startConfig,
			rules,
			resources,
			primaryIconId: resourceKey,
			developerPreset: {
				resourceTargets: [{ key: resourceKey, target: 100 }],
				landCount: 5,
			},
		});
		api = new GameApiFake();
		setGameApi(api);
		api.setNextCreateResponse({
			sessionId: 'session-1',
			snapshot: initialSnapshot,
			registries: createSessionRegistriesPayload(),
		});
	});
	afterEach(() => {
		setGameApi(null);
	});
	const taxActionId = 'tax';
	it('creates a session using the API response payload', async () => {
		const created = await createSession({
			devMode: true,
			playerName: 'Commander',
		});
		expect(created.sessionId).toBe('session-1');
		expect(created.snapshot).toEqual(initialSnapshot);
		expect(created.ruleSnapshot).toEqual(initialSnapshot.rules);
		expect(created.resourceKeys).toEqual(resourceKeys);
		expect(created.registries).toHaveProperty('actions');
		expect(created.metadata).toEqual(initialSnapshot.metadata);
	});
	it('fetches snapshots via the API client', async () => {
		await createSession();
		const fetched = await fetchSnapshot('session-1');
		expect(fetched.snapshot).toEqual(initialSnapshot);
		expect(fetched.ruleSnapshot).toEqual(initialSnapshot.rules);
		expect(fetched.metadata).toEqual(initialSnapshot.metadata);
	});

	it('sets dev mode via the API and refreshes local state', async () => {
		const created = await createSession();
		const session = created.legacySession;
		const setDevModeSpy = vi.spyOn(session, 'setDevMode');
		const updatedSnapshot = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			turn: 5,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.steps?.[0]?.id ?? 'phase-main',
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
		expect(result.session).toBe(created.session);
		expect(result.legacySession).toBe(session);
		expect(result.snapshot).toEqual(updatedSnapshot);
		expect(result.ruleSnapshot).toEqual(updatedSnapshot.rules);
		expect(result.metadata).toEqual(updatedSnapshot.metadata);
		expect(result.registries.actions.get(taxActionId)?.name).toBe(
			'Tax (Developer)',
		);
		expect(result.resourceKeys).not.toContain(resourceKey);
		expect(setDevModeSpy).toHaveBeenCalledWith(true);
		setDevModeSpy.mockRestore();
	});

	it('propagates abort signals without touching cached registries', async () => {
		const created = await createSession();
		const deserializeSpy = vi.spyOn(
			sessionRegistriesModule,
			'deserializeSessionRegistries',
		);
		const fetchMock = vi.fn(
			(_input: RequestInfo, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					const signal = init?.signal;
					if (!signal) {
						reject(new Error('Missing abort signal.'));
						return;
					}
					signal.addEventListener(
						'abort',
						() => reject(new DOMException('Aborted', 'AbortError')),
						{ once: true },
					);
				}),
		);
		setGameApi(createGameApi({ fetchFn: fetchMock }));
		const controller = new AbortController();
		const promise = fetchSnapshot(created.sessionId, {
			signal: controller.signal,
		});
		controller.abort();
		await expect(promise).rejects.toBeInstanceOf(DOMException);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(deserializeSpy).not.toHaveBeenCalled();
		deserializeSpy.mockRestore();
	});
	it('performs session actions via the API and mirrors locally', async () => {
		const created = await createSession();
		const session = created.session;
		const performSpy = vi.spyOn(session, 'performAction').mockReturnValue([]);
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
			ruleSnapshot,
			turn: 2,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.steps?.[0]?.id ?? 'phase-main',
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
		expect(performSpy).toHaveBeenCalledWith(taxActionId, undefined);
	});
	it('returns error payloads when the API action fails', async () => {
		const { session } = await createSession();
		api.setNextActionResponse({
			status: 'error',
			error: 'Nope.',
		});
		const performSpy = vi.spyOn(session, 'performAction');
		const response = await performSessionAction({
			sessionId: 'session-1',
			actionId: taxActionId,
		});
		expect(response.status).toBe('error');
		expect(performSpy).not.toHaveBeenCalled();
	});
	it('converts thrown API errors into error responses', async () => {
		const { session } = await createSession();
		setGameApi(
			createGameApiMock({
				performAction: () => {
					throw new Error('Boom');
				},
			}),
		);
		const performSpy = vi.spyOn(session, 'performAction');
		const response = await performSessionAction({
			sessionId: 'session-1',
			actionId: taxActionId,
		});
		expect(response.status).toBe('error');
		expect(response).toHaveProperty('error', 'Boom');
		expect(performSpy).not.toHaveBeenCalled();
	});
	it('advances phases via the API and mirrors locally', async () => {
		await createSession();
		const advanceSpy = vi
			.spyOn((await fetchSnapshot('session-1')).session, 'advancePhase')
			.mockReturnValue({
				phase: 'phase-main',
				step: 'phase-main:start',
				effects: [],
				player: playerA,
			});
		const updatedSnapshot = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			turn: 2,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.steps?.[0]?.id ?? 'phase-main',
		});
		api.setNextAdvanceResponse({
			sessionId: 'session-1',
			snapshot: updatedSnapshot,
			advance: {
				phase: 'phase-main',
				step: 'phase-main:start',
				effects: [],
				player: playerA,
			},
			registries: createSessionRegistriesPayload(),
		});
		const response = await advanceSessionPhase({ sessionId: 'session-1' });
		expect(response.snapshot).toEqual(updatedSnapshot);
		expect(advanceSpy).toHaveBeenCalled();
	});
	it('updates cached registries and resource keys when the phase advances', async () => {
		const created = await createSession();
		const { session, registries, resourceKeys } = created;
		const advanceSpy = vi.spyOn(session, 'advancePhase').mockReturnValue({
			phase: 'phase-main',
			step: 'phase-main:start',
			effects: [],
			player: playerA,
		});
		const updatedSnapshot = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: resourceKey,
			ruleSnapshot,
			turn: 2,
			currentPhase: phases[0]?.id ?? 'phase-main',
			currentStep: phases[0]?.steps?.[0]?.id ?? 'phase-main',
		});
		const mutatedRegistries = createSessionRegistriesPayload();
		mutatedRegistries.actions[taxActionId] = {
			...mutatedRegistries.actions[taxActionId],
			name: 'Tax (Advanced)',
		};
		delete mutatedRegistries.resources[resourceKey];
		api.setNextAdvanceResponse({
			sessionId: 'session-1',
			snapshot: updatedSnapshot,
			advance: {
				phase: 'phase-main',
				step: 'phase-main:start',
				effects: [],
				player: playerA,
			},
			registries: mutatedRegistries,
		});
		await advanceSessionPhase({ sessionId: 'session-1' });
		expect(advanceSpy).toHaveBeenCalled();
		expect(registries.actions.get(taxActionId)?.name).toBe('Tax (Advanced)');
		expect(registries.resources[resourceKey]).toBeUndefined();
		expect(resourceKeys).not.toContain(resourceKey);
	});
	it('releases session state from the local cache', async () => {
		await createSession();
		releaseSession('session-1');
		await expect(fetchSnapshot('session-1')).rejects.toThrow(
			'Session not found',
		);
	});
});
