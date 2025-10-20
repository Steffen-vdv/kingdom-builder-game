import { describe, expect, it, beforeEach } from 'vitest';
import type {
	SessionCreateResponse,
	SessionStateResponse,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import {
	applySessionState,
	assertSessionRecord,
	clearSessionStateStore,
	getSessionRecord,
	initializeSessionState,
} from '../../src/state/sessionStateStore';
import { createSessionRegistriesPayload } from '../helpers/sessionRegistries';
import {
	createEmptySnapshotMetadata,
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

const createMetadata = (overrides: Partial<SessionSnapshotMetadata> = {}) =>
	createEmptySnapshotMetadata(overrides);

describe('sessionStateStore', () => {
	beforeEach(() => {
		clearSessionStateStore();
	});

	const players = [
		createSnapshotPlayer({ id: 'A', name: 'Player A' }),
		createSnapshotPlayer({ id: 'B', name: 'Player B' }),
	];
	const phases = [
		{
			id: 'phase:start',
			action: true,
			steps: [{ id: 'phase:start:step' }],
		},
	];
	const createBaseSnapshot = (): SessionSnapshot =>
		createSessionSnapshot({
			players,
			activePlayerId: players[0]?.id ?? 'A',
			opponentId: players[1]?.id ?? 'B',
			phases,
			actionCostResource: 'gold',
			ruleSnapshot: {
				tieredResourceKey: 'gold',
				tierDefinitions: [],
				winConditions: [],
			},
			metadata: createMetadata({
				effectLogs: {
					resolution: [{ label: 'Start' }],
				},
			}),
		}) as unknown as SessionSnapshot;

	it('clones snapshot and metadata when initializing', () => {
		const baseSnapshot = createBaseSnapshot();
		const response: SessionCreateResponse = {
			sessionId: 'session:test',
			snapshot: baseSnapshot,
			registries: createSessionRegistriesPayload(),
		};
		const record = initializeSessionState(response);
		expect(record.snapshot).toEqual(baseSnapshot);
		expect(record.snapshot).not.toBe(baseSnapshot);
		expect(record.metadata).toEqual(baseSnapshot.metadata);
		expect(record.metadata).not.toBe(baseSnapshot.metadata);
		const [logKey] = Object.keys(baseSnapshot.metadata.effectLogs ?? {});
		if (logKey) {
			const originalLog = baseSnapshot.metadata.effectLogs?.[logKey];
			const storedLog = record.metadata.effectLogs?.[logKey];
			if (originalLog && storedLog) {
				expect(storedLog).not.toBe(originalLog);
			}
		}
		baseSnapshot.game.turn = baseSnapshot.game.turn + 1;
		expect(record.snapshot.game.turn).toBe(1);
	});

	it('merges registry updates while preserving existing entries', () => {
		const initialSnapshot = createBaseSnapshot();
		const createResponse: SessionCreateResponse = {
			sessionId: 'session:merge',
			snapshot: initialSnapshot,
			registries: createSessionRegistriesPayload(),
		};
		initializeSessionState(createResponse);
		const existingRecord = getSessionRecord('session:merge');
		expect(existingRecord).toBeDefined();
		const nextSnapshot = createSessionSnapshot({
			players,
			activePlayerId: players[0]?.id ?? 'A',
			opponentId: players[1]?.id ?? 'B',
			phases,
			actionCostResource: 'gold',
			ruleSnapshot: initialSnapshot.rules,
			metadata: createMetadata({
				effectLogs: {
					resolution: [{ label: 'Advance' }],
				},
			}),
		}) as unknown as SessionSnapshot;
		const registriesPayload = createSessionRegistriesPayload();
		const actionIds = Object.keys(registriesPayload.actions ?? {});
		const firstAction = actionIds[0];
		if (!firstAction) {
			throw new Error('No actions defined in test registries');
		}
		registriesPayload.actions = {
			['extra-action']: structuredClone(registriesPayload.actions[firstAction]),
		};
		const resourceKeys = Object.keys(registriesPayload.resources ?? {});
		const firstResource = resourceKeys[0];
		if (firstResource) {
			const bonusResource = structuredClone(
				registriesPayload.resources[firstResource],
			);
			bonusResource.key = 'bonus-resource';
			registriesPayload.resources['bonus-resource'] = bonusResource;
		}
		const stateResponse: SessionStateResponse = {
			sessionId: 'session:merge',
			snapshot: nextSnapshot,
			registries: registriesPayload,
		};
		const updated = applySessionState(stateResponse);
		expect(updated.registries.actions.has(firstAction)).toBe(true);
		expect(updated.registries.actions.has('extra-action')).toBe(true);
		if (firstResource) {
			expect(updated.registries.resources[firstResource]).toBeDefined();
			expect(updated.registries.resources['bonus-resource']).toBeDefined();
			expect(updated.resourceKeys).toContain('bonus-resource');
		}
		expect(updated.metadata).toEqual(nextSnapshot.metadata);
	});

	it('throws when asserting an unknown session record', () => {
		expect(() => assertSessionRecord('missing:session')).toThrow(
			/Missing session record/,
		);
	});
});
