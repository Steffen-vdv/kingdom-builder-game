import { describe, it, expect } from 'vitest';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

describe('SessionManager', () => {
	it('creates and retrieves sessions using synthetic content', () => {
		const { manager, costKey, gainKey } = createSyntheticSessionManager();
		const sessionId = 'session-1';
		const session = manager.createSession(sessionId, {
			devMode: true,
		});
		expect(manager.getSession(sessionId)).toBe(session);
		expect(manager.getSessionCount()).toBe(1);
		const snapshot = manager.getSnapshot(sessionId);
		const [activePlayer] = snapshot.game.players;
		expect(activePlayer?.resources[costKey]).toBeDefined();
		expect(snapshot.rules.tieredResourceKey).toBe(gainKey);
		expect(snapshot.game.devMode).toBe(true);
	});

	it('destroys sessions and releases resources', () => {
		const { manager } = createSyntheticSessionManager();
		const sessionId = 'session-destroy';
		manager.createSession(sessionId);
		const destroyed = manager.destroySession(sessionId);
		expect(destroyed).toBe(true);
		expect(manager.getSession(sessionId)).toBeUndefined();
		expect(manager.getSessionCount()).toBe(0);
	});

	it('throws when creating a duplicate session identifier', () => {
		const { manager } = createSyntheticSessionManager();
		const sessionId = 'duplicate';
		manager.createSession(sessionId);
		expect(() => manager.createSession(sessionId)).toThrow(
			`Session "${sessionId}" already exists.`,
		);
	});

	it('provides rule snapshots from the active session', () => {
		const { manager, gainKey } = createSyntheticSessionManager();
		const sessionId = 'rules';
		manager.createSession(sessionId);
		const ruleSnapshot = manager.getRuleSnapshot(sessionId);
		expect(ruleSnapshot.tieredResourceKey).toBe(gainKey);
	});

	it('throws when retrieving snapshots for unknown sessions', () => {
		const { manager } = createSyntheticSessionManager();
		expect(() => manager.getSnapshot('missing')).toThrow(
			'Session "missing" was not found.',
		);
	});
});
