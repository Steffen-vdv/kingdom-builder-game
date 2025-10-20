import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameApiFake } from '../../src/services/gameApi';
import {
	createSession,
	loadActionCosts,
	loadActionRequirements,
	setGameApi,
} from '../../src/state/sessionSdk';
import { readSessionActionMetadata } from '../../src/state/sessionActionMetadataStore';
import { clearSessionStateStore } from '../../src/state/sessionStateStore';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createSessionRegistriesPayload,
	createResourceKeys,
} from '../helpers/sessionRegistries';

const resourceKeys = createResourceKeys();
const [resourceKey] = resourceKeys;

if (!resourceKey) {
	throw new Error('No resource keys available for tests.');
}

const playerA = createSnapshotPlayer({
	id: 'A',
	resources: { [resourceKey]: 10 },
});
const playerB = createSnapshotPlayer({
	id: 'B',
	resources: { [resourceKey]: 5 },
});

const phases = [
	{
		id: 'phase-main',
		action: true,
		steps: [{ id: 'phase-main:start' }],
	},
];

describe('useActionMetadata integration', () => {
	let api: GameApiFake;
	let registriesPayload: ReturnType<typeof createSessionRegistriesPayload>;

	beforeEach(() => {
		api = new GameApiFake();
		setGameApi(api);
		const snapshot = createSessionSnapshot({
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
			currentStep: phases[0]?.steps?.[0]?.id ?? 'phase-main:start',
		});
		registriesPayload = createSessionRegistriesPayload();
		registriesPayload.resources = Object.fromEntries(
			resourceKeys.map((key) => [key, { key, icon: '🪙', label: key }]),
		);
		api.setNextCreateResponse({
			sessionId: 'session-meta',
			snapshot,
			registries: registriesPayload,
		});
	});

	afterEach(() => {
		setGameApi(null);
		clearSessionStateStore();
	});

	it('stores action costs and requirements after loading for a new session', async () => {
		const { sessionId } = await createSession();
		const actionId = Object.keys(registriesPayload.actions ?? {})[0];
		if (!actionId) {
			throw new Error('No actions available in registries.');
		}

		api.setNextActionCostResponse({
			sessionId,
			actionId,
			costs: { [resourceKey]: 3 },
		});
		api.setNextActionRequirementResponse({
			sessionId,
			actionId,
			requirements: [],
		});

		expect(
			readSessionActionMetadata(sessionId, actionId, undefined).costs,
		).toBeUndefined();

		await loadActionCosts(sessionId, actionId);
		await loadActionRequirements(sessionId, actionId);

		const snapshot = readSessionActionMetadata(sessionId, actionId, undefined);
		expect(snapshot.costs).toEqual({ [resourceKey]: 3 });
		expect(snapshot.requirements).toEqual([]);
	});
});
