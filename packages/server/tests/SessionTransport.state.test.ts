import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import { PopulationRole, Resource, Stat } from '@kingdom-builder/contents';

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
		expect(state.registries.resources[costKey]).toMatchObject({
			key: costKey,
		});
		expect(state.registries.resources[gainKey]).toMatchObject({
			key: gainKey,
		});
		const { metadata } = state.snapshot;
		expect(metadata.resources).toBeDefined();
		expect(metadata.populations).toBeDefined();
		expect(metadata.buildings).toBeDefined();
		expect(metadata.developments).toBeDefined();
		expect(metadata.stats).toBeDefined();
		expect(metadata.phases).toBeDefined();
		expect(metadata.triggers).toBeDefined();
		expect(metadata.assets).toBeDefined();
		expect(metadata.resources?.[Resource.gold]).toMatchObject({
			label: 'Gold',
			icon: '🪙',
		});
		expect(metadata.triggers?.onGainAPStep).toMatchObject({
			icon: '⚡',
			label: 'AP step',
			future: 'During AP step',
		});
		const councilDefinition =
			state.registries.populations[PopulationRole.Council];
		expect(metadata.populations?.[PopulationRole.Council]).toMatchObject({
			icon: councilDefinition.icon,
			label: councilDefinition.name,
		});
		const [buildingId, buildingDefinition] = Object.entries(
			state.registries.buildings,
		)[0];
		expect(metadata.buildings?.[buildingId]).toMatchObject({
			label: buildingDefinition.name,
			icon: buildingDefinition.icon,
		});
		const [developmentId, developmentDefinition] = Object.entries(
			state.registries.developments,
		)[0];
		expect(metadata.developments?.[developmentId]).toMatchObject({
			label: developmentDefinition.name,
			icon: developmentDefinition.icon,
		});
		expect(metadata.stats?.[Stat.maxPopulation]).toMatchObject({
			icon: '👥',
			label: 'Max Population',
		});
		expect(metadata.phases?.main).toMatchObject({
			label: 'Main Phase',
			icon: '🎯',
		});
		expect(metadata.phases?.main?.steps?.[0]).toMatchObject({
			label: 'Main Actions',
			icon: '🗡️',
		});
		expect(metadata.assets?.land).toMatchObject({
			icon: '🗺️',
			label: 'Land',
		});
		expect(metadata.assets?.slot).toMatchObject({
			icon: '🧩',
			label: 'Development Slot',
		});
		expect(metadata.assets?.passive).toMatchObject({
			icon: '♾️',
			label: 'Passive',
		});
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
