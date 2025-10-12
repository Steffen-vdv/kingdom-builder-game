import { describe, it, expect } from 'vitest';
import {
	RESOURCES,
	Resource,
	STATS,
	Stat,
	PHASES,
	PhaseId,
	PhaseTrigger,
	TRIGGER_INFO,
	PopulationRole,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
} from '@kingdom-builder/contents';
import { SessionManager } from '../src/session/SessionManager.js';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

const middleware = createTokenAuthMiddleware({
	tokens: {
		'session-manager': {
			userId: 'session-manager',
			roles: ['session:create', 'session:advance', 'admin'],
		},
	},
});

const authorizedHeaders = {
	authorization: 'Bearer session-manager',
} satisfies Record<string, string>;

describe('SessionTransport session state', () => {
	it('enriches metadata descriptors from real content', () => {
		const manager = new SessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'real-content-session'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const baseSnapshot = manager.getSnapshot(sessionId);
		const state = transport.getSessionState({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		const metadata = state.snapshot.metadata;
		expect(metadata.resources?.[Resource.gold]).toMatchObject({
			label: RESOURCES[Resource.gold].label,
			icon: RESOURCES[Resource.gold].icon,
		});
		const councilDefinition =
			state.registries.populations[PopulationRole.Council];
		expect(metadata.populations?.[PopulationRole.Council]).toMatchObject({
			label: councilDefinition.name,
			icon: councilDefinition.icon,
		});
		expect(metadata.stats?.[Stat.maxPopulation]).toMatchObject({
			label: STATS[Stat.maxPopulation].label,
			icon: STATS[Stat.maxPopulation].icon,
		});
		const growthPhase = PHASES.find((phase) => phase.id === PhaseId.Growth);
		expect(metadata.phases?.[PhaseId.Growth]).toMatchObject({
			label: growthPhase?.label,
			icon: growthPhase?.icon,
		});
		expect(metadata.triggers?.[PhaseTrigger.OnGrowthPhase]).toMatchObject({
			label: TRIGGER_INFO[PhaseTrigger.OnGrowthPhase].past,
			icon: TRIGGER_INFO[PhaseTrigger.OnGrowthPhase].icon,
		});
		expect(metadata.assets?.land).toMatchObject({
			label: LAND_INFO.label,
			icon: LAND_INFO.icon,
		});
		expect(metadata.assets?.slot).toMatchObject({
			label: SLOT_INFO.label,
			icon: SLOT_INFO.icon,
		});
		expect(metadata.assets?.passive).toMatchObject({
			label: PASSIVE_INFO.label,
			icon: PASSIVE_INFO.icon,
		});
		expect(metadata.effectLogs).toEqual(baseSnapshot.metadata.effectLogs);
		expect(metadata.passiveEvaluationModifiers).toEqual(
			baseSnapshot.metadata.passiveEvaluationModifiers,
		);
	});

	it('returns session state snapshots', () => {
		const { manager, actionId, costKey, gainKey } =
			createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'state-session'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const state = transport.getSessionState({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(state.sessionId).toBe(sessionId);
		expect(state.snapshot.game.players).toHaveLength(2);
		expect(state.registries.actions[actionId]).toBeDefined();
		expect(state.registries.resources[costKey]).toMatchObject({ key: costKey });
		expect(state.registries.resources[gainKey]).toMatchObject({ key: gainKey });
	});

	it('throws when a session cannot be located', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'missing-session'
				: undefined,
			authMiddleware: middleware,
		});
		const expectNotFound = () =>
			transport.getSessionState({
				body: { sessionId: 'missing' },
				headers: authorizedHeaders,
			});
		expect(expectNotFound).toThrow(TransportError);
		try {
			expectNotFound();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
			}
		}
	});

	it('validates session identifiers before fetching state', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		const attempt = () =>
			transport.getSessionState({
				body: {},
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});
});
