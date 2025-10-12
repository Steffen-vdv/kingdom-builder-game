import { describe, it, expect } from 'vitest';
import {
	RESOURCES,
	POPULATIONS,
	STATS,
	PHASES,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
} from '@kingdom-builder/contents';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { SessionManager } from '../src/session/SessionManager.js';
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

	it('enriches metadata descriptors using real content registries', () => {
		const manager = new SessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: () => 'content-session',
			authMiddleware: middleware,
		});
		const { sessionId, snapshot } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const baseSnapshot = manager.getSnapshot(sessionId);
		const { metadata } = snapshot;
		expect(metadata.passiveEvaluationModifiers).toEqual(
			baseSnapshot.metadata.passiveEvaluationModifiers,
		);
		if ('effectLogs' in baseSnapshot.metadata) {
			expect(metadata.effectLogs).toEqual(baseSnapshot.metadata.effectLogs);
		} else {
			expect(metadata).not.toHaveProperty('effectLogs');
		}
		expect(metadata.resources).toBeDefined();
		const resources = metadata.resources!;
		for (const [key, info] of Object.entries(RESOURCES)) {
			expect(resources[key]).toMatchObject({
				label: info.label,
				icon: info.icon,
			});
		}
		expect(metadata.populations).toBeDefined();
		const populations = metadata.populations!;
		for (const [id, definition] of POPULATIONS.entries()) {
			expect(populations[id]).toMatchObject({
				label: definition.name,
				icon: definition.icon,
			});
		}
		expect(metadata.stats).toBeDefined();
		const stats = metadata.stats!;
		for (const [key, info] of Object.entries(STATS)) {
			expect(stats[key]).toMatchObject({
				label: info.label,
				icon: info.icon,
			});
		}
		expect(metadata.phases).toBeDefined();
		const phases = metadata.phases!;
		for (const phase of PHASES) {
			if (!phase.id) {
				continue;
			}
			const descriptor = phases[phase.id];
			expect(descriptor).toBeDefined();
			expect(descriptor?.label).toBe(phase.label);
			expect(descriptor?.icon).toBe(phase.icon);
		}
		expect(metadata.triggers).toBeDefined();
		const triggers = metadata.triggers!;
		for (const [key, info] of Object.entries(TRIGGER_INFO)) {
			expect(triggers[key]).toMatchObject({
				label: info.past,
				icon: info.icon,
				future: info.future,
				past: info.past,
			});
		}
		expect(metadata.assets).toBeDefined();
		const assets = metadata.assets!;
		expect(assets.land).toMatchObject({
			label: LAND_INFO.label,
			icon: LAND_INFO.icon,
		});
		expect(assets.slot).toMatchObject({
			label: SLOT_INFO.label,
			icon: SLOT_INFO.icon,
		});
		expect(assets.passive).toMatchObject({
			label: PASSIVE_INFO.label,
			icon: PASSIVE_INFO.icon,
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
