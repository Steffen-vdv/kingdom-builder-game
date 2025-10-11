import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { ActionExecuteSuccessResponse } from '@kingdom-builder/protocol/actions';
import {
	createSession,
	fetchSnapshot,
	performSessionAction,
	advanceSessionPhase,
	releaseSession,
	setGameApi,
} from '../../src/state/sessionSdk';
import { GameApiFake, createGameApiMock } from '../../src/services/gameApi';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';

describe('sessionSdk', () => {
	const TAX_ACTION_ID = 'tax';
	const resourceKeys = createResourceKeys();
	const [resourceKey] = resourceKeys;
	if (!resourceKey) {
		throw new Error('RESOURCE_KEYS is empty');
	}
	const phases = [
		{
			id: 'phase-main',
			name: 'Main Phase',
			action: true,
			steps: [{ id: 'phase-main:start', name: 'Start' }],
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
			actionId: TAX_ACTION_ID,
		});
		expect(response).toEqual(successResponse);
		expect(performSpy).toHaveBeenCalledWith(TAX_ACTION_ID, undefined);
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
			actionId: TAX_ACTION_ID,
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
			actionId: TAX_ACTION_ID,
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
		mutatedRegistries.actions[TAX_ACTION_ID] = {
			...mutatedRegistries.actions[TAX_ACTION_ID],
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
		expect(registries.actions.get(TAX_ACTION_ID)?.name).toBe('Tax (Advanced)');
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
